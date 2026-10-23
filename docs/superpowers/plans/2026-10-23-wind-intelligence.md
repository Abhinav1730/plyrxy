# Wind Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver a tested historical wind forecast dashboard faithful to the selected blue reference.

**Architecture:** One React/FastAPI origin, immutable Elexon snapshot, pure analytical functions. Data retrieval runs explicitly outside web requests.

**Tech Stack:** React, TypeScript, Vite, Recharts, Phosphor icons, FastAPI, Pydantic, httpx, pytest, Docker.

**Spec:** `docs/architecture.md`

## Global Constraints
- Decision dates 2026-01-01 through 2026-01-31; default cutoff 10:00 Europe/London.
- Only WINDFOR and WIND FUELHH. No simulated fallback or extra market feeds.
- Primary comparison uses native hourly forecast targets and same-start half-hour actuals; sensitivity uses complete two-half-hour means.
- Preserve selected design; exclude recording guidance and scripts.

## Review Focus
- Forecasts published after cutoff never enter any target or metric.
- Nulls, duplicates, missing halves and zero denominators do not fabricate confidence.
- January boundary includes February delivery and has full expected grids even with missing source data.
- Filter races, fetch failures and invalid query inputs remain visible and recoverable.
- Snapshot corruption, CSV consistency, responsive charts and production SPA routing work.

### Task 1: Analytics contract
**Files:** `backend/app/analytics.py`, `backend/app/models.py`, `backend/tests/test_analytics.py`.
**Interfaces:** validated Record -> Snapshot -> `day_report(snapshot, decision_date, cutoff)` and `metrics(points)`.
- [x] Write and run failing tests for cutoff equality, future exclusion, per-target selection, nulls, conflict detection, exact/mean alignment, missing grid, metrics and date boundaries.
- [x] Implement indexed selection and pure reports; run `python -m pytest backend/tests/test_analytics.py -q` expecting all pass.

### Task 2: Ingestion and reproducibility
**Files:** `backend/app/ingest.py`, `backend/app/repository.py`, `backend/tests/test_ingest.py`, `data/snapshot.json.gz`, `data/manifest.json`.
**Interfaces:** Elexon arrays -> validated Snapshot; `load_snapshot(path)` verifies manifest SHA256.
- [x] Test retry/nonretry boundaries, malformed responses and corrupt snapshot behavior before implementation.
- [x] Implement bounded daily fetches with lookback, manifest and atomic snapshot writes. Ingest real data; audit date coverage and publication cadence.
- [x] Run ingest and analytics suites; verify every selected publication <= cutoff across January and several cutoffs.

### Task 3: HTTP API
**Files:** `backend/app/main.py`, `backend/tests/test_api.py`.
**Interfaces:** `/api/v1/meta`, `/day`, `/accuracy`, `/export`, `/healthz`, `/readyz`.
- [x] Write failing API tests for schema, invalid dates/cutoffs, zero data, CSV agreement, readiness and route behavior.
- [x] Implement typed responses, validation and static SPA serving; run complete pytest suite.

### Task 4: Dashboard
**Files:** `frontend/src/App.tsx`, `frontend/src/components.tsx`, `frontend/src/api.ts`, `frontend/src/styles.css`, frontend build configuration.
**Interfaces:** typed reports from Task 3. Abortable fetching; relative API URL.
- [x] Add failing user-facing component tests for date-to-delivery updates, tab navigation, table paging and error recovery.
- [x] Build selected reference: top navigation, filters, line/error charts, right snapshot, hourly table; responsive accuracy/methodology views.
- [x] Run frontend tests and TypeScript production build; browser-test dates, cutoffs, navigation, CSV and mobile layout.

### Task 5: Package and verify
**Files:** Dockerfile, compose.yaml, CI, README, docs/methodology.md, docs/verification.md, design-qa.md.
- [x] Package compiled frontend and snapshot; add Docker healthcheck and nonroot runtime.
- [x] Run backend/frontend checks and Docker verification where runtime is available.
- [x] Compare browser capture with selected reference; fix actionable differences, record QA and independent review.
- [x] Document reproducible startup, API, limitations, AI assistance, hypothesis outcomes and deployment instructions. No video material.
