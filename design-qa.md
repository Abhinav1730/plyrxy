# Design QA

**Final result: passed**

## Visual truth and capture

- Source: selected user attachment `C:/Users/ABHINA~1/AppData/Local/Temp/codex-clipboard-25ac5d97-44cb-4fb3-a324-7b5f660e8628.png`, 1487 × 1058 pixels.
- Rendered app: `http://127.0.0.1:8000/`.
- Desktop evidence: ignored `artifacts/replay-desktop.jpg`, captured with a 1488 × 1058 CSS viewport; browser content capture is 1473 × 1048 pixels after native viewport/chrome exclusion. Device scale approximately 1. No image stretching or density resampling was used. Native capture margins are excluded from visual judgment.
- Mobile evidence: ignored `artifacts/replay-mobile.jpg`, 390 × 844 CSS viewport, browser content capture 375 × 811 pixels.
- Methodology evidence: ignored `artifacts/methodology-desktop.jpg`, 1473 × 1048 content pixels.
- Desktop reference state: decision 14 January 2026, delivery 15 January, cutoff 10:00 GMT, Decision replay tab. The reference uses illustrative values; the application uses actual API-derived values, so curves and metrics intentionally differ.

## Findings and iteration history

Initial capture preserved the top navigation, pale filter toolbar, blue forecast line, dashed slate actuals, signed error chart, right snapshot and lower data table. Two actionable differences were found:

- [P2, fixed] The snapshot footnote and extra coverage copy stretched the panel, moving the interval table below the reference’s intended position. Reduced panel spacing and retained the comparison explanation in the footer/methodology. Final capture places the table immediately below the charts and snapshot.
- [P2, fixed] Eight visible rows made the page substantially taller than the reference. Changed the table to four-row pagination with working previous/next controls. Final capture matches the reference’s four visible observations and keeps all 24 targets accessible.

Native-input verification also reproduced a browser/autofill event mismatch: the input value changed without React’s dependent delivery value changing. A failing regression test pinned the behavior. Added explicit native input handlers alongside change handlers; the test and subsequent browser edits passed.

## Fidelity surfaces

- **Fonts/typography:** locally served Inter, dark bold page heading, clear numeric hierarchy, monospaced table values. Focused review of the original-resolution header, snapshot labels and table confirms legibility. The generated reference is not an exact font specification; minor differences in glyph widths and dense table text are accepted.
- **Spacing/layout:** open white surface, slim top bar, lightly tinted toolbar, dominant left chart area and divided right snapshot. No nested cards or heavy shadows. Four-row interval table retains the reference’s density. Pagination adds a small amount of functional vertical space; the attribution footer may sit just below the initial viewport.
- **Colors/tokens:** blue `#246bfe` forecast and controls, slate `#475569` actuals, pale neutral grid and amber negative error. No dark theme or confidence band was added. On the default real-data day all errors are positive; negative amber bars remain supported and are tested through signed analytical cases.
- **Images/icons:** no photos or raster illustration assets are required. Standard Phosphor calendar/download/arrows and WaveSine brand icon are used. The generated double-wave mark is represented by the closest simple wave icon rather than bespoke SVG art. This minor brand-mark variation is accepted.
- **Copy/content:** illustrative values and preview labels were replaced with real Elexon figures and delivery context. “Matched timestamps” and the explicit matching-half-hour footer clarify the actual comparison semantics. Assignment/recording instructions do not appear in the product.

Full-view comparison: source and final implementation were opened together through the image viewer. Focused review used the readable original-resolution header/filter row, snapshot panel, legend and four table rows. No additional crop was needed because both desktop captures are under 1500 pixels wide and these regions were legible at native resolution.

## Responsive and interaction checks

At mobile width, navigation remains visible, filters wrap rather than hiding, the heading wraps naturally, charts retain the available width, the snapshot moves below charts, and the table remains horizontally scrollable within its own region. The mobile screenshot shows no page content clipped horizontally; a separate DOM overflow measurement timed out in the browser automation and is not claimed as numerical proof.

Verified in the browser:

- 31 January decision → 1 February delivery and matching CSV query.
- 12:00 cutoff → 11:30 selected publication.
- Midnight cutoff → visible 22/24 matched-data warning.
- Table next-page control → hours 5–8.
- CSV download → 24 data rows with provenance.
- Accuracy navigation → monthly report rendered.
- Methodology navigation → policy text and integrity-checked snapshot rendered.
- Earlier desktop console inspection reported no error/warning entries. A later mobile console read timed out; no claim of exhaustive console instrumentation is made.

Browser viewport was reset after testing. Runtime and screenshot verification were performed with the application, not inferred from build or HTTP success.

## Remaining polish

- [P3] The generic wave icon and exact glyph proportions differ slightly from the generated concept.
- [P3] Native date fields use the browser’s locale-specific date formatting instead of reproducing the image’s static date text.

No actionable P0/P1/P2 findings remain. Screenshot files are ignored local QA evidence and are not needed to run the application.
