# Homepage addition

Extend the existing blue-and-white product design with a public introductory homepage at `/`. Keep the analytical workspace at `/dashboard`, with native links between the two so browser navigation and refresh work. The homepage must work without fetching analytics data.

Use two locally packaged AI-generated photographs: coastal turbines in the hero and an offshore wind farm alongside data/scope text. They are illustrative, not images of a named facility. Images need descriptive alt text, explicit dimensions and responsive crops; load the lower image lazily.

Content explains the three existing workflows: reconstruct the decision, measure forecast error, inspect provenance. State the January 2026 historical cohort and GB dataset scope without implying real procurement volumes or a live forecast service. Primary action opens the dashboard; supporting links open accuracy and methodology. No new market datasets, services or credentials.

Verification: test homepage navigation and no-data-loading behavior, retain dashboard tests, run production build and backend tests, then inspect desktop/mobile rendering and the dashboard transition. Commit and push all project files to `origin/main` as explicitly requested. The remote was inspected and has no existing branch history; use a normal push, never a force push.
