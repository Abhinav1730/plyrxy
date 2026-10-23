"""FastAPI analytics and same-origin production SPA."""

import csv
import io
import logging
import os
from contextlib import asynccontextmanager
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response

from .analytics import FIRST_DECISION, LAST_DECISION, day_report, month_report
from .models import DayReport, MonthReport, Snapshot
from .repository import DEFAULT_DATA_DIR, load_snapshot

logger = logging.getLogger(__name__)
Cutoff = Annotated[str, Query(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")]


def create_app(
    snapshot: Snapshot | None = None, data_dir: Path | None = None, static_dir: Path | None = None
) -> FastAPI:
    loaded = snapshot
    root = static_dir or Path(__file__).resolve().parents[2] / "frontend" / "dist"

    @asynccontextmanager
    async def lifespan(app):
        nonlocal loaded
        if loaded is None:
            try:
                loaded = load_snapshot(data_dir or Path(os.environ.get("DATA_DIR", DEFAULT_DATA_DIR)))
            except (OSError, ValueError, KeyError):
                logger.exception("Historical snapshot unavailable; readiness will fail")
        yield

    app = FastAPI(title="Wind Intelligence", version="1.0.0", lifespan=lifespan)

    def get_snapshot() -> Snapshot:
        if loaded is None:
            raise HTTPException(503, "Historical snapshot unavailable. Run python -m backend.app.ingest.")
        return loaded

    @lru_cache(maxsize=128)
    def get_day(decision_date: date, cutoff: str) -> DayReport:
        try:
            return day_report(get_snapshot(), decision_date, cutoff)
        except ValueError as error:
            raise HTTPException(422, str(error)) from error

    @lru_cache(maxsize=32)
    def get_month(cutoff: str) -> MonthReport:
        return month_report(get_snapshot(), cutoff)

    @app.get("/healthz")
    def health():
        return {"status": "ok"}

    @app.get("/readyz")
    def readiness():
        return {"status": "ready", "snapshot_id": get_snapshot().snapshot_id}

    @app.get("/api/v1/meta")
    def meta():
        source = get_snapshot()
        return {
            "decision_from": FIRST_DECISION,
            "decision_to": LAST_DECISION,
            "default_decision_date": "2026-01-14",
            "default_cutoff": "10:00",
            "timezone": "Europe/London",
            "comparison": "timestamp-matched",
            "snapshot_id": source.snapshot_id,
            "manifest": {k: v for k, v in source.manifest.items() if k != "queries"},
        }

    @app.get("/api/v1/day", response_model=DayReport)
    def day(decision_date: date = date(2026, 1, 14), cutoff: Cutoff = "10:00"):
        return get_day(decision_date, cutoff)

    @app.get("/api/v1/accuracy", response_model=MonthReport)
    def accuracy(cutoff: Cutoff = "10:00"):
        return get_month(cutoff)

    @app.get("/api/v1/export")
    def export(decision_date: date = date(2026, 1, 14), cutoff: Cutoff = "10:00"):
        report = get_day(decision_date, cutoff)
        buffer = io.StringIO(newline="")
        columns = [
            "start_time",
            "forecast_mw",
            "actual_mw",
            "error_mw",
            "publish_time",
            "actual_publish_time",
            "hour_mean_actual_mw",
            "status",
            "decision_date",
            "cutoff_utc",
            "snapshot_id",
            "comparison",
        ]
        writer = csv.DictWriter(buffer, fieldnames=columns)
        writer.writeheader()
        for point in report.points:
            writer.writerow(
                {
                    **point.model_dump(mode="json"),
                    "decision_date": report.decision_date.isoformat(),
                    "cutoff_utc": report.cutoff.isoformat().replace("+00:00", "Z"),
                    "snapshot_id": report.snapshot_id,
                    "comparison": report.comparison,
                }
            )
        return Response(
            buffer.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="wind-{decision_date}-{cutoff.replace(":", "")}.csv"'
            },
        )

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404, "API route not found")
        requested = (root / path).resolve()
        if not requested.is_relative_to(root.resolve()):
            raise HTTPException(404, "File not found")
        if path and requested.is_file():
            return FileResponse(requested)
        if path.startswith("assets/") or Path(path).suffix:
            raise HTTPException(404, "Asset not found")
        index = root / "index.html"
        if not index.exists():
            raise HTTPException(404, "Frontend not built. Run npm run build in frontend.")
        return FileResponse(index)

    return app


app = create_app()
