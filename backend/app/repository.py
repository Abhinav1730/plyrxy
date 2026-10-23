"""Load a packaged, integrity-checked historical snapshot."""

import gzip
import hashlib
import json
from pathlib import Path

from .models import Record, Snapshot

DEFAULT_DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def load_snapshot(directory: Path = DEFAULT_DATA_DIR) -> Snapshot:
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    compressed = (directory / "snapshot.json.gz").read_bytes()
    checksum = hashlib.sha256(compressed).hexdigest()
    if checksum != manifest["sha256"]:
        raise ValueError("Snapshot checksum mismatch; run ingestion to restore data")
    payload = json.loads(gzip.decompress(compressed))
    if payload.get("schema_version") != 1:
        raise ValueError("Unsupported snapshot schema")
    forecasts = [Record.model_validate(row) for row in payload["forecasts"]]
    actuals = [Record.model_validate(row) for row in payload["actuals"]]
    if len(forecasts) != manifest["forecast_records"] or len(actuals) != manifest["actual_records"]:
        raise ValueError("Snapshot record count mismatch")
    return Snapshot(forecasts, actuals, checksum[:12], manifest)
