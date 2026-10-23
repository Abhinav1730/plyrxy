"""Reproducible competing-hypothesis checks against the packaged real snapshot."""

import json
from datetime import timedelta

from .analytics import FIRST_DECISION, day_report, metrics, month_report
from .repository import load_snapshot


def audit():
    snapshot = load_snapshot()
    results = {}
    for cutoff in ["00:00", "04:30", "09:29", "09:30", "10:00", "12:00", "23:59"]:
        report = month_report(snapshot, cutoff)
        assert report.metrics.expected == 744
        for i in range(31):
            day = day_report(snapshot, FIRST_DECISION + timedelta(days=i), cutoff)
            for point in day.points:
                if point.publish_time is not None:
                    assert point.publish_time <= day.cutoff
                    eligible = [
                        r
                        for r in snapshot.forecasts_by_target[point.start_time]
                        if r.publish_time <= day.cutoff
                    ]
                    assert point.publish_time == max(r.publish_time for r in eligible)
        results[cutoff] = {
            "matched": report.metrics.matched,
            "mae_mw": report.metrics.mae_mw,
            "hour_mean_mae_mw": report.sensitivity.mae_mw,
        }
    primary = month_report(snapshot, "10:00")
    latest_pairs = []
    for i in range(31):
        for point in day_report(snapshot, FIRST_DECISION + timedelta(days=i), "10:00").points:
            rows = snapshot.forecasts_by_target.get(point.start_time, [])
            latest_pairs.append((rows[-1].generation if rows else None, point.actual_mw))
    # Deliberately contaminated comparator: demonstrates that future data changes the result.
    contaminated = metrics(latest_pairs, 744)
    assert contaminated.mae_mw != primary.metrics.mae_mw
    assert all(r.start_time.minute == 0 for r in snapshot.forecasts)
    assert len(snapshot.actuals_by_target) == 1488
    print(
        json.dumps(
            {
                "snapshot": snapshot.snapshot_id,
                "cutoffs": results,
                "leaky_latest_forecast_mae_mw": contaminated.mae_mw,
                "primary": primary.metrics.model_dump(),
                "sensitivity": primary.sensitivity.model_dump(),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    audit()
