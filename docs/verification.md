# Verification record

Snapshot: `a67fd043fa48`. Source: Elexon WINDFOR and WIND FUELHH, retrieved 23 October 2026. Checks use the packaged data and require no external requests.

## Automated evidence

- Backend: 36 tests covering cutoff inclusion/exclusion, independent target selection, null supersession, duplicates, zero/missing metrics, alignment, revisions, date boundaries, validation, CSV agreement, failure readiness, static routing, retries, snapshot corruption, cache provenance, and real-data selection invariants.
- Frontend: 7 tests covering filter parameters, delivery rollover, navigation, pagination, errors, native input events, stale responses, loading consistency, and retry. Layout-heavy chart components are replaced in interaction unit tests; charts are checked in the real browser.
- Production TypeScript/Vite build and generated OpenAPI types.
- Ruff lint/format and Prettier formatting.
- npm audit: zero known vulnerabilities after upgrading Vitest to 5.0.5.
- Docker multistage build; running image readiness and January-boundary API checked; process UID/GID 10001.

One backend test dependency emits a Starlette deprecation notice about its httpx-based TestClient adapter. It does not affect API execution or test assertions.

## Competing hypotheses tested

| Hypothesis | Experiment and outcome |
|---|---|
| Latest currently available forecast is adequate | Deliberately leaky selection produces 1,657.49 MW MAE versus 1,995.57 MW for the correct 10:00 replay. Rejected: future information changes the result. |
| Forecast and actual resolutions match | Snapshot has only minute-00 forecast targets and minute-00/30 actuals. Rejected: interpolation must not be silently introduced. |
| Hourly actual averaging does not affect results | 10:00 MAE becomes 2,013.01 MW instead of 1,995.57 MW. Preserve the primary native-timestamp diagnostic and disclose sensitivity/semantic uncertainty. |
| Every cutoff has full forecast coverage | Midnight has 682/744 pairs; 10:00 has 744/744. Rejected: retain missing grids and coverage. |
| Equality at publication time is irrelevant | Comparing 09:29 and 09:30 changes selected forecasts and monthly MAE. Include exact cutoff equality. |
| Rebuilding a cache means data was newly retrieved | A regression test distinguishes retrieval time from snapshot build time. Rejected. |
| Aborting alone prevents every stale response | Resolve older promises after newer ones, including a transport that ignores cancellation. The current-request guard preserves the new result. |
| Native browser input events always trigger React change handling | Regression reproduces a value updated before its input event. Explicit native input handling fixes the dependent delivery date and query. |

Run `python -m backend.app.audit` to reproduce the real-data comparisons. It also verifies every selected target against an independent maximum-publication oracle for seven cutoffs.

## Independent review

A separate read-only reviewer inspected backend, frontend and Docker implementation and ran all 36 backend tests. No critical or important findings. Two minor ingestion limitations were identified and deferred:

1. Raw source target strings are filtered before timezone normalization. The packaged source is UTC, so shipped results are unaffected. A future feed containing offset timestamps at cohort boundaries should instead be filtered after validation.
2. Raw cache writes are not atomic. A process interrupted while writing ignored `data/raw/` can leave invalid JSON; ingestion will fail closed. Re-ingest into a fresh `--data-dir` to recover without using the malformed cache. The packaged normalized snapshot is integrity checked and unaffected.

The reviewer accepted explicit alignment limitations, retrospective actual revisions, per-target cutoff behavior, latest-null handling, missing grids, pair-weighted monthly metrics, CSV consistency, React response cancellation guards and deployment paths. The reviewer did not independently establish external forecast averaging semantics or assess browser fidelity.

## Deployment status

Local execution and Docker packaging are verified. Public Heroku/Vercel hosting has not been provisioned; no public URL is claimed. CI configuration is included but remote CI has not been run because this repository has not been pushed.

Browser layout and interaction evidence is recorded separately in `design-qa.md`. Screenshots under ignored `artifacts/` are local verification outputs, not runtime dependencies.
