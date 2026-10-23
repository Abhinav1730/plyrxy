import csv
import io

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.models import Record, Snapshot


@pytest.fixture
def client():
    row = Record(startTime="2026-01-15T00:00:00Z", publishTime="2026-01-14T09:30:00Z", generation=100)
    snapshot = Snapshot(
        [row], [row.model_copy(update={"fuel_type": "WIND", "generation": 80})], "fixture", {}
    )
    with TestClient(create_app(snapshot=snapshot)) as test_client:
        yield test_client


def test_day_and_csv_agree(client):
    report = client.get("/api/v1/day?decision_date=2026-01-14&cutoff=10:00")
    assert report.status_code == 200
    body = report.json()
    assert body["points"][0]["error_mw"] == 20
    assert body["snapshot_id"] == "fixture"
    export = client.get("/api/v1/export?decision_date=2026-01-14&cutoff=10:00")
    assert "attachment" in export.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(export.text)))
    assert len(rows) == 24
    assert float(rows[0]["error_mw"]) == body["points"][0]["error_mw"]
    assert rows[1]["forecast_mw"] == ""
    assert rows[0]["cutoff_utc"] == body["cutoff"]


@pytest.mark.parametrize(
    "query", ["decision_date=2026-02-01", "decision_date=oops", "cutoff=24:00", "cutoff=9:00"]
)
def test_invalid_queries_return_validation_error(client, query):
    assert client.get(f"/api/v1/day?{query}").status_code == 422


def test_accuracy_meta_and_health(client):
    assert client.get("/healthz").status_code == 200
    assert client.get("/readyz").status_code == 200
    meta = client.get("/api/v1/meta").json()
    assert meta["decision_to"] == "2026-01-31"
    report = client.get("/api/v1/accuracy").json()
    assert report["metrics"]["expected"] == 744
    assert report["metrics"]["matched"] == 1


def test_missing_snapshot_is_not_ready_and_api_returns_actionable_error(tmp_path):
    with TestClient(create_app(data_dir=tmp_path)) as client:
        assert client.get("/healthz").status_code == 200
        assert client.get("/readyz").status_code == 503
        response = client.get("/api/v1/day")
        assert response.status_code == 503
        assert "snapshot" in response.json()["detail"].lower()


def test_unknown_api_route_does_not_fall_back_to_html(client):
    response = client.get("/api/v1/no-such-route")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")


def test_spa_deep_link_but_not_missing_assets(tmp_path):
    (tmp_path / "index.html").write_text("<html>app</html>")
    with TestClient(create_app(snapshot=Snapshot([], [], "empty", {}), static_dir=tmp_path)) as client:
        assert client.get("/methodology").text == "<html>app</html>"
        assert client.get("/assets/missing.js").status_code == 404
        assert client.get("/api/v1/unknown").status_code == 404
        assert (
            client.get("/../secret").status_code == 404 or client.get("/../secret").text == "<html>app</html>"
        )
