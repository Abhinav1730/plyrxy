"""Validated source records and explicit, nullable HTTP response contracts."""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Record(BaseModel):
    model_config = ConfigDict(populate_by_name=True, frozen=True)
    start_time: datetime = Field(alias="startTime")
    publish_time: datetime = Field(alias="publishTime")
    generation: float | None = Field(ge=0, allow_inf_nan=False)
    fuel_type: str | None = Field(default=None, alias="fuelType")

    @field_validator("start_time", "publish_time")
    @classmethod
    def aware_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Source timestamps must include a timezone")
        return value.astimezone(timezone.utc)


def deduplicate(records: list[Record]) -> list[Record]:
    unique: dict[tuple, Record] = {}
    for record in records:
        key = (record.start_time, record.publish_time, record.fuel_type)
        previous = unique.get(key)
        if previous is not None and previous.generation != record.generation:
            raise ValueError(f"Source conflict for {key}")
        unique[key] = record
    return sorted(unique.values(), key=lambda r: (r.start_time, r.publish_time))


@dataclass
class Snapshot:
    forecasts: list[Record]
    actuals: list[Record]
    snapshot_id: str
    manifest: dict[str, Any]
    forecasts_by_target: dict[datetime, list[Record]] = field(init=False)
    actuals_by_target: dict[datetime, Record] = field(init=False)

    def __post_init__(self):
        self.forecasts = deduplicate(self.forecasts)
        self.actuals = deduplicate([r for r in self.actuals if r.fuel_type == "WIND"])
        self.forecasts_by_target = defaultdict(list)
        for record in self.forecasts:
            self.forecasts_by_target[record.start_time].append(record)
        self.actuals_by_target = {}
        for record in self.actuals:
            # Records are sorted by publication within each target.
            self.actuals_by_target[record.start_time] = record


class Metrics(BaseModel):
    expected: int
    matched: int
    coverage_percent: float
    forecast_average_mw: float | None
    mae_mw: float | None
    rmse_mw: float | None
    bias_mw: float | None
    wape_percent: float | None
    overforecast_percent: float | None
    underforecast_percent: float | None


class Point(BaseModel):
    start_time: datetime
    forecast_mw: float | None
    actual_mw: float | None
    error_mw: float | None
    publish_time: datetime | None
    actual_publish_time: datetime | None
    hour_mean_actual_mw: float | None
    status: str


class DayReport(BaseModel):
    decision_date: date
    delivery_date: date
    cutoff: datetime
    snapshot_id: str
    comparison: str = "timestamp-matched"
    expected_actual_half_hours: int = 48
    available_actual_half_hours: int
    forecast_available: int
    publication_times: list[datetime]
    latest_publication: datetime | None
    oldest_publication: datetime | None
    stale_forecast_count: int
    points: list[Point]
    metrics: Metrics
    sensitivity: Metrics


class DailySummary(BaseModel):
    decision_date: date
    delivery_date: date
    metrics: Metrics


class MonthReport(BaseModel):
    decision_from: date
    decision_to: date
    cutoff_local: str
    snapshot_id: str
    metrics: Metrics
    sensitivity: Metrics
    days: list[DailySummary]
