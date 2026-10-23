# Wind Intelligence design

React/TypeScript implements the selected blue analyst workspace. FastAPI serves analytics and the compiled SPA from one origin. A separate ingestion command downloads only Elexon WINDFOR and WIND FUELHH. A compressed, versioned snapshot ships with the application: requests never depend on Elexon availability.

```mermaid
flowchart LR
  E[Elexon WINDFOR + FUELHH] --> I[Explicit ingestion CLI]
  I --> V[Validate and deduplicate]
  V --> S[Compressed JSON snapshot + manifest]
  S --> R[Repository indexed by target time]
  R --> A[Cutoff selection / alignment / metrics]
  A --> F[FastAPI typed responses + CSV]
  F --> U[React dashboard]
```

Decision dates are 1–31 January 2026; delivery dates are 2 January–1 February. The cutoff defaults to 10:00 Europe/London, a pilot assumption, not an official exchange deadline. Users can change it. Forecast selection is per target: latest publication at or before the cutoff, including equality. The latest eligible null remains missing; it must not revive an older superseded value. Actuals are retrospective latest retrieved observations, not as-of observations.

Observed WINDFOR targets are hourly; FUELHH averages are half-hourly. The primary report joins exact start timestamps, retains native forecasts, and describes the actual as the matching half-hour. This is a timestamp-matched diagnostic, not a claim of equivalent averaging periods. A separate hourly-mean sensitivity check requires both half-hours; no interpolation or synthetic forecast is introduced. Neither comparison resolves unspecified forecast averaging semantics. No MWh or real procurement requirement is inferred.

Alternatives considered: split Vercel/Heroku deployment adds CORS and two release points; live fetches add outages and changing evidence; a database is unnecessary for this small fixed historical pilot. One Docker image with a packaged immutable snapshot is the chosen implementation recommendation.

The interface contains Decision replay, Accuracy, and Methodology. Only real API-derived figures appear. It exposes publication provenance, coverage, missing data, signed error, MAE, RMSE, bias and WAPE. Charts, dates, cutoff, table pagination and CSV export work. No authentication, demand/prices, trading execution, AI inference, recording guidance or video scripts are included.

Data validation rejects naive timestamps, nonfinite/negative generation and conflicting same-key duplicates. Exact duplicates collapse. Nulls remain missing. Runtime fails readiness if snapshot integrity fails. Browser requests are cancellable and stale responses cannot overwrite current filters.
