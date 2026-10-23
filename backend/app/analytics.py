"""Pure historical reconstruction. Never select a post-cutoff publication."""

import math
import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from .models import DailySummary, DayReport, Metrics, MonthReport, Point, Snapshot

FIRST_DECISION = date(2026, 1, 1)
LAST_DECISION = date(2026, 1, 31)
LONDON = ZoneInfo("Europe/London")


def parse_cutoff(value: str) -> time:
    if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value):
        raise ValueError("Cutoff must be HH:MM between 00:00 and 23:59")
    return time.fromisoformat(value)


def metrics(pairs: list[tuple[float | None, float | None]], expected: int) -> Metrics:
    matched = [(f, a) for f, a in pairs if f is not None and a is not None]
    forecasts = [f for f, _ in pairs if f is not None]
    n = len(matched)
    errors = [f - a for f, a in matched]
    total_actual = sum(a for _, a in matched)
    return Metrics(
        expected=expected,
        matched=n,
        coverage_percent=100 * n / expected if expected else 0,
        forecast_average_mw=sum(forecasts) / len(forecasts) if forecasts else None,
        mae_mw=sum(abs(e) for e in errors) / n if n else None,
        rmse_mw=math.sqrt(sum(e * e for e in errors) / n) if n else None,
        bias_mw=sum(errors) / n if n else None,
        wape_percent=100 * sum(abs(e) for e in errors) / total_actual if total_actual else None,
        overforecast_percent=100 * sum(e > 0 for e in errors) / n if n else None,
        underforecast_percent=100 * sum(e < 0 for e in errors) / n if n else None,
    )


def day_report(snapshot: Snapshot, decision_date: date, cutoff_local: str) -> DayReport:
    if not FIRST_DECISION <= decision_date <= LAST_DECISION:
        raise ValueError("Decision date must be in January 2026")
    cutoff = datetime.combine(decision_date, parse_cutoff(cutoff_local), LONDON).astimezone(timezone.utc)
    delivery = decision_date + timedelta(days=1)
    start = datetime.combine(delivery, time(), LONDON).astimezone(timezone.utc)
    end = datetime.combine(delivery + timedelta(days=1), time(), LONDON).astimezone(timezone.utc)
    targets = [start + timedelta(hours=i) for i in range(int((end - start).total_seconds() / 3600))]
    points = []
    for target in targets:
        eligible = [r for r in snapshot.forecasts_by_target.get(target, []) if r.publish_time <= cutoff]
        forecast = eligible[-1] if eligible else None
        actual = snapshot.actuals_by_target.get(target)
        second = snapshot.actuals_by_target.get(target + timedelta(minutes=30))
        f = forecast.generation if forecast else None
        a = actual.generation if actual else None
        b = second.generation if second else None
        points.append(
            Point(
                start_time=target,
                forecast_mw=f,
                actual_mw=a,
                error_mw=f - a if f is not None and a is not None else None,
                publish_time=forecast.publish_time if forecast else None,
                actual_publish_time=actual.publish_time if actual else None,
                hour_mean_actual_mw=(a + b) / 2 if a is not None and b is not None else None,
                status="matched"
                if f is not None and a is not None
                else "missing_forecast"
                if f is None
                else "missing_actual",
            )
        )
    publications = sorted({p.publish_time for p in points if p.publish_time is not None})
    return DayReport(
        decision_date=decision_date,
        delivery_date=delivery,
        cutoff=cutoff,
        snapshot_id=snapshot.snapshot_id,
        points=points,
        expected_actual_half_hours=len(targets) * 2,
        available_actual_half_hours=sum(
            r.generation is not None for t, r in snapshot.actuals_by_target.items() if start <= t < end
        ),
        forecast_available=sum(p.forecast_mw is not None for p in points),
        publication_times=publications,
        latest_publication=publications[-1] if publications else None,
        oldest_publication=publications[0] if publications else None,
        stale_forecast_count=sum(
            p.publish_time is not None and cutoff - p.publish_time > timedelta(hours=24) for p in points
        ),
        metrics=metrics([(p.forecast_mw, p.actual_mw) for p in points], len(targets)),
        sensitivity=metrics([(p.forecast_mw, p.hour_mean_actual_mw) for p in points], len(targets)),
    )


def month_report(snapshot: Snapshot, cutoff_local: str) -> MonthReport:
    reports = [day_report(snapshot, FIRST_DECISION + timedelta(days=i), cutoff_local) for i in range(31)]
    points = [p for r in reports for p in r.points]
    return MonthReport(
        decision_from=FIRST_DECISION,
        decision_to=LAST_DECISION,
        cutoff_local=cutoff_local,
        snapshot_id=snapshot.snapshot_id,
        metrics=metrics([(p.forecast_mw, p.actual_mw) for p in points], len(points)),
        sensitivity=metrics([(p.forecast_mw, p.hour_mean_actual_mw) for p in points], len(points)),
        days=[
            DailySummary(decision_date=r.decision_date, delivery_date=r.delivery_date, metrics=r.metrics)
            for r in reports
        ],
    )
