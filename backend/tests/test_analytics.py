from datetime import date, datetime, timezone

import pytest

from backend.app.analytics import day_report, metrics, month_report
from backend.app.models import Record, Snapshot


def record(target, value, published="2026-01-14T09:30:00Z", fuel=None):
    return Record(start_time=target, publish_time=published, generation=value, fuel_type=fuel)


def snapshot(forecasts=(), actuals=()):
    return Snapshot(forecasts=list(forecasts), actuals=list(actuals), snapshot_id="test", manifest={})


T = "2026-01-15T00:00:00Z"


def test_selects_latest_eligible_per_target_includes_equality_and_excludes_future():
    s = snapshot(
        [
            record(T, 90),
            record(T, 100, "2026-01-14T10:00:00Z"),
            record(T, 999, "2026-01-14T10:00:01Z"),
            record("2026-01-15T01:00:00Z", 200, "2026-01-13T23:00:00Z"),
        ],
        [record(T, 80, fuel="WIND")],
    )
    report = day_report(s, date(2026, 1, 14), "10:00")
    assert len(report.points) == 24
    assert report.points[0].forecast_mw == 100
    assert report.points[0].error_mw == 20
    assert report.points[1].forecast_mw == 200
    assert report.metrics.matched == 1
    assert report.metrics.coverage_percent == pytest.approx(100 / 24)
    assert report.delivery_date == date(2026, 1, 15)


def test_null_latest_forecast_does_not_resurrect_superseded_value():
    s = snapshot([record(T, 100), record(T, None, "2026-01-14T10:00:00Z")])
    assert day_report(s, date(2026, 1, 14), "10:00").points[0].forecast_mw is None


def test_exact_duplicates_collapse_but_conflicts_fail():
    s = snapshot([record(T, 100), record(T, 100)])
    assert len(s.forecasts) == 1
    with pytest.raises(ValueError, match="conflict"):
        snapshot([record(T, 100), record(T, 101)])


def test_primary_is_exact_timestamp_and_sensitivity_requires_both_actual_halves():
    s = snapshot(
        [record(T, 100)], [record(T, 80, fuel="WIND"), record("2026-01-15T00:30:00Z", 120, fuel="WIND")]
    )
    r = day_report(s, date(2026, 1, 14), "10:00")
    assert r.points[0].actual_mw == 80
    assert r.points[0].hour_mean_actual_mw == 100
    assert r.metrics.mae_mw == 20
    assert r.sensitivity.mae_mw == 0
    incomplete = day_report(
        snapshot([record(T, 100)], [record(T, 80, fuel="WIND")]), date(2026, 1, 14), "10:00"
    )
    assert incomplete.sensitivity.matched == 0
    assert incomplete.sensitivity.mae_mw is None


def test_retrospective_actual_uses_latest_publication_and_filters_nonwind():
    s = snapshot(
        [record(T, 100)],
        [
            record(T, 80, fuel="WIND"),
            record(T, 85, "2026-01-20T00:00:00Z", "WIND"),
            record(T, 500, fuel="GAS"),
        ],
    )
    assert day_report(s, date(2026, 1, 14), "10:00").points[0].actual_mw == 85


def test_metrics_known_values_zero_and_missing():
    result = metrics([(100, 80), (80, 100), (None, 10)], expected=3)
    assert result.mae_mw == 20
    assert result.rmse_mw == 20
    assert result.bias_mw == 0
    assert result.wape_percent == pytest.approx(100 * 40 / 180)
    assert result.overforecast_percent == 50
    assert result.forecast_average_mw == 90
    assert metrics([(100, 0)], 1).wape_percent is None
    assert metrics([], 24).mae_mw is None


def test_january_decision_boundaries_and_complete_missing_grid():
    s = snapshot()
    assert day_report(s, date(2026, 1, 31), "10:00").delivery_date == date(2026, 2, 1)
    assert day_report(s, date(2026, 1, 1), "00:00").delivery_date == date(2026, 1, 2)
    r = month_report(s, "10:00")
    assert len(r.days) == 31
    assert r.metrics.expected == 744
    assert r.metrics.matched == 0
    assert r.metrics.bias_mw is None


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -1])
def test_rejects_nonfinite_or_negative_generation(value):
    with pytest.raises(ValueError):
        record(T, value)


def test_rejects_naive_timestamps_and_invalid_cutoff():
    with pytest.raises(ValueError):
        record("2026-01-15T00:00:00", 100)
    with pytest.raises(ValueError):
        day_report(snapshot(), date(2026, 1, 14), "25:00")
    with pytest.raises(ValueError):
        day_report(snapshot(), date(2026, 2, 1), "10:00")


def test_offset_timestamps_normalize_to_utc():
    r = record("2026-01-15T01:00:00+01:00", 100)
    assert r.start_time == datetime(2026, 1, 15, tzinfo=timezone.utc)


def test_month_metrics_weight_all_pairs_instead_of_daily_metric_averages():
    s = snapshot(
        [record(T, 100), record("2026-01-16T00:00:00Z", 1000)],
        [record(T, 80, fuel="WIND"), record("2026-01-16T00:00:00Z", 500, fuel="WIND")],
    )
    r = month_report(s, "10:00")
    assert r.metrics.wape_percent == pytest.approx(100 * 520 / 580)
    assert r.metrics.mae_mw == 260
