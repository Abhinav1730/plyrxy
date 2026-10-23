"""Explicit historical ingestion: python -m backend.app.ingest. No API key."""

import argparse
import gzip
import hashlib
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import httpx

from .models import Record, Snapshot
from .repository import DEFAULT_DATA_DIR

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"


def fetch_rows(client: httpx.Client, dataset: str, params: dict, sleep=time.sleep) -> list[dict]:
    for attempt in range(4):
        try:
            response = client.get(f"{BASE_URL}/datasets/{dataset}/stream", params=params)
            if response.status_code == 429 or response.status_code >= 500:
                response.raise_for_status()
            response.raise_for_status()
            rows = response.json()
            if not isinstance(rows, list):
                raise ValueError(f"{dataset} expected a JSON array")
            return rows
        except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError) as error:
            retryable = (
                not isinstance(error, httpx.HTTPStatusError)
                or error.response.status_code == 429
                or error.response.status_code >= 500
            )
            if not retryable or attempt == 3:
                raise
            sleep(2**attempt)
    raise RuntimeError("Unreachable retry state")


def write_snapshot(directory: Path, forecasts: list[dict], actuals: list[dict], queries: list[dict]) -> dict:
    validated = Snapshot(
        [Record.model_validate(r) for r in forecasts], [Record.model_validate(r) for r in actuals], "", {}
    )
    payload = {
        "schema_version": 1,
        "forecasts": [r.model_dump(mode="json", by_alias=True) for r in validated.forecasts],
        "actuals": [r.model_dump(mode="json", by_alias=True) for r in validated.actuals],
    }
    compressed = gzip.compress(json.dumps(payload, separators=(",", ":"), allow_nan=False).encode(), mtime=0)
    checksum = hashlib.sha256(compressed).hexdigest()
    built_at = datetime.now(timezone.utc).isoformat()
    retrieved_at = max((q["retrieved_at"] for q in queries if "retrieved_at" in q), default=built_at)
    manifest = {
        "schema_version": 1,
        "sha256": checksum,
        "snapshot_id": checksum[:12],
        "retrieved_at": retrieved_at,
        "built_at": built_at,
        "source": "Elexon Insights Solution",
        "source_base_url": BASE_URL,
        "attribution": "Contains BMRS data © Elexon Limited copyright and database right.",
        "decision_from": "2026-01-01",
        "decision_to": "2026-01-31",
        "delivery_from": "2026-01-02",
        "delivery_to": "2026-02-01",
        "forecast_records": len(validated.forecasts),
        "actual_records": len(validated.actuals),
        "raw_forecast_records": len(forecasts),
        "raw_actual_records": len(actuals),
        "duplicate_forecasts_removed": len(forecasts) - len(validated.forecasts),
        "duplicate_actuals_or_nonwind_removed": len(actuals) - len(validated.actuals),
        "null_forecast_records": sum(r.generation is None for r in validated.forecasts),
        "null_actual_records": sum(r.generation is None for r in validated.actuals),
        "forecast_minutes_observed": sorted({r.start_time.minute for r in validated.forecasts}),
        "queries": queries,
    }
    directory.mkdir(parents=True, exist_ok=True)
    # Each file is atomically replaced. A concurrent reader between replacements
    # fails closed on checksum mismatch rather than serving mixed versions.
    snapshot_temp = directory / "snapshot.json.gz.tmp"
    manifest_temp = directory / "manifest.json.tmp"
    snapshot_temp.write_bytes(compressed)
    manifest_temp.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    os.replace(snapshot_temp, directory / "snapshot.json.gz")
    os.replace(manifest_temp, directory / "manifest.json")
    return manifest


def ingest(directory: Path):
    jobs = []
    # Three-day lookback supports early January cutoffs without using later publications.
    for offset in range(34):
        day = date(2025, 12, 29) + timedelta(days=offset)
        jobs.append(
            (
                "WINDFOR",
                {
                    "publishDateTimeFrom": f"{day}T00:00:00Z",
                    "publishDateTimeTo": f"{day + timedelta(days=1)}T00:00:00Z",
                },
            )
        )
    for offset in range(31):
        day = date(2026, 1, 2) + timedelta(days=offset)
        jobs.append(
            ("FUELHH", {"settlementDateFrom": str(day), "settlementDateTo": str(day), "fuelType": "WIND"})
        )
    directory.mkdir(parents=True, exist_ok=True)
    raw_dir = directory / "raw"
    raw_dir.mkdir(exist_ok=True)

    with httpx.Client(
        timeout=httpx.Timeout(60, connect=15), headers={"Accept": "application/json"}
    ) as client:

        def retrieve(job):
            dataset, params = job
            key = hashlib.sha256(json.dumps(job, sort_keys=True).encode()).hexdigest()[:16]
            cache = raw_dir / f"{dataset}-{key}.json"
            if cache.exists():
                cached = json.loads(cache.read_text(encoding="utf-8"))
                if isinstance(cached, list):
                    # Preserve retrieval time for caches created before envelope metadata.
                    rows = cached
                    retrieved_at = datetime.fromtimestamp(cache.stat().st_mtime, timezone.utc).isoformat()
                else:
                    rows, retrieved_at = cached["rows"], cached["retrieved_at"]
            else:
                rows = fetch_rows(client, dataset, params)
                retrieved_at = datetime.now(timezone.utc).isoformat()
                cache.write_text(json.dumps({"rows": rows, "retrieved_at": retrieved_at}), encoding="utf-8")
            return dataset, params, rows, retrieved_at

        forecasts, actuals, queries = [], [], []
        with ThreadPoolExecutor(max_workers=3) as pool:
            for index, (dataset, params, rows, retrieved_at) in enumerate(pool.map(retrieve, jobs)):
                queries.append(
                    {
                        "dataset": dataset,
                        "params": params,
                        "returned_records": len(rows),
                        "retrieved_at": retrieved_at,
                    }
                )
                (forecasts if dataset == "WINDFOR" else actuals).extend(rows)
                print(f"{index + 1}/{len(jobs)} {dataset}: {len(rows)} records", flush=True)
    # Query boundaries can be inclusive. Normalize duplicates after filtering targets.
    forecasts = [r for r in forecasts if "2026-01-02" <= r["startTime"] < "2026-02-02"]
    actuals = [r for r in actuals if "2026-01-02" <= r["startTime"] < "2026-02-02"]
    if not forecasts or not actuals:
        raise ValueError(
            "Ingestion returned an empty source dataset; existing snapshot has not been replaced"
        )
    manifest = write_snapshot(directory, forecasts, actuals, queries)
    print(json.dumps({k: v for k, v in manifest.items() if k != "queries"}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    ingest(parser.parse_args().data_dir)
