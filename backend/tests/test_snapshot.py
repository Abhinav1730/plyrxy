"""Integration invariants against real, packaged Elexon data (no network)."""

from datetime import timedelta

import pytest

from backend.app.analytics import FIRST_DECISION, day_report, month_report
from backend.app.repository import load_snapshot


@pytest.fixture(scope="module")
def real_snapshot():
    return load_snapshot()


@pytest.mark.parametrize("cutoff", ["00:00", "09:29", "09:30", "10:00", "23:59"])
def test_all_january_selections_agree_with_independent_maximum_oracle(real_snapshot, cutoff):
    for i in range(31):
        r = day_report(real_snapshot, FIRST_DECISION + timedelta(days=i), cutoff)
        for point in r.points:
            candidates = [
                f
                for f in real_snapshot.forecasts_by_target.get(point.start_time, [])
                if f.publish_time <= r.cutoff
            ]
            oracle = max(candidates, key=lambda f: f.publish_time) if candidates else None
            assert point.publish_time == (oracle.publish_time if oracle else None)
            assert point.forecast_mw == (oracle.generation if oracle else None)


def test_real_snapshot_has_expected_native_resolutions_and_full_default_coverage(real_snapshot):
    assert {r.start_time.minute for r in real_snapshot.forecasts} == {0}
    assert {r.start_time.minute for r in real_snapshot.actuals} == {0, 30}
    report = month_report(real_snapshot, "10:00")
    assert report.metrics.matched == report.metrics.expected == 744
    assert report.sensitivity.matched == 744
    assert len(real_snapshot.actuals_by_target) == 1488


def test_exact_publication_boundary_changes_selected_snapshot(real_snapshot):
    before = day_report(real_snapshot, FIRST_DECISION + timedelta(days=13), "09:29")
    after = day_report(real_snapshot, FIRST_DECISION + timedelta(days=13), "09:30")
    assert before.points[0].publish_time < after.points[0].publish_time
    assert any(a.forecast_mw != b.forecast_mw for a, b in zip(before.points, after.points))
