import gzip
import hashlib
import json

import httpx
import pytest

from backend.app.ingest import fetch_rows, write_snapshot
from backend.app.repository import load_snapshot


def test_retries_transient_but_not_bad_requests():
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(503 if len(calls) < 3 else 200, json=[])

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        assert fetch_rows(client, "WINDFOR", {}, sleep=lambda _: None) == []
    assert len(calls) == 3
    calls.clear()
    with httpx.Client(
        transport=httpx.MockTransport(lambda r: calls.append(r) or httpx.Response(400))
    ) as client:
        with pytest.raises(httpx.HTTPStatusError):
            fetch_rows(client, "WINDFOR", {}, sleep=lambda _: None)
    assert len(calls) == 1


def test_rejects_malformed_response():
    with httpx.Client(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"error": "oops"}))
    ) as client:
        with pytest.raises(ValueError, match="array"):
            fetch_rows(client, "WINDFOR", {})


def test_snapshot_round_trip_and_corruption(tmp_path):
    row = {"startTime": "2026-01-15T00:00:00Z", "publishTime": "2026-01-14T09:30:00Z", "generation": 100}
    write_snapshot(tmp_path, [row], [{**row, "fuelType": "WIND"}], [])
    loaded = load_snapshot(tmp_path)
    assert loaded.forecasts[0].generation == 100
    assert loaded.actuals[0].fuel_type == "WIND"
    (tmp_path / "snapshot.json.gz").write_bytes(b"corrupt")
    with pytest.raises(ValueError, match="checksum"):
        load_snapshot(tmp_path)


def test_manifest_counts_cannot_silently_disagree(tmp_path):
    write_snapshot(tmp_path, [], [], [])
    manifest = json.loads((tmp_path / "manifest.json").read_text())
    manifest["forecast_records"] = 999
    (tmp_path / "manifest.json").write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="count"):
        load_snapshot(tmp_path)


def test_invalid_generation_never_replaces_valid_snapshot(tmp_path):
    write_snapshot(tmp_path, [], [], [])
    original = (tmp_path / "snapshot.json.gz").read_bytes()
    with pytest.raises(ValueError):
        write_snapshot(tmp_path, [{"startTime": "bad", "publishTime": "bad", "generation": -1}], [], [])
    assert (tmp_path / "snapshot.json.gz").read_bytes() == original


def test_unknown_snapshot_schema_is_rejected(tmp_path):
    write_snapshot(tmp_path, [], [], [])
    path = tmp_path / "snapshot.json.gz"
    payload = json.loads(gzip.decompress(path.read_bytes()))
    payload["schema_version"] = 99
    path.write_bytes(gzip.compress(json.dumps(payload).encode()))
    manifest_path = tmp_path / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    manifest_path.write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="schema"):
        load_snapshot(tmp_path)


def test_rebuilding_cached_data_does_not_claim_it_was_refetched_today(tmp_path):
    manifest = write_snapshot(tmp_path, [], [], [{"retrieved_at": "2026-01-20T12:00:00+00:00"}])
    assert manifest["retrieved_at"] == "2026-01-20T12:00:00+00:00"
    assert manifest["built_at"] >= manifest["retrieved_at"]
