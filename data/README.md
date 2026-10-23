# Historical snapshot

`snapshot.json.gz` contains normalized, deduplicated source-derived WINDFOR records and WIND FUELHH actuals. `manifest.json` records source queries, retrieval/build timestamps, counts and the compressed file’s SHA256. Both files are intentionally versioned for reproducible offline startup.

Current cohort: decision dates 1–31 January 2026; delivery 2 January–1 February. Forecast-publication queries begin 29 December 2025. All 48 native actual half-hours per delivery day are retained. Analytics score the 24 hourly target timestamps; a separate sensitivity calculation uses complete two-half-hour means.

`raw/` is an ignored ingestion cache and is not required to run the application. Refresh with `python -m backend.app.ingest`. Verify with `python -m backend.app.audit`.

Contains BMRS data © Elexon Limited copyright and database right. Source: [Elexon Insights](https://developer.data.elexon.co.uk/). Reuse is governed by the [BMRS data licence](https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/).
