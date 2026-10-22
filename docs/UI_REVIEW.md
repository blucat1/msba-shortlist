# Interface review — October 22, 2026

This review uses fresh, unauthenticated Chromium contexts and the isolated fictional demo. It does not open a personal Google session, inspect private cloud tracker data or contact a job feed. Human usability testing remains deferred. The findings below are measured browser observations, not a claim of complete accessibility conformance.

## Deployed baseline

The existing public deployment was reviewed at 1440, 1024, 768, 390 and 320 CSS pixels on Opportunities, My Search and Insights, in both anonymous live and demo modes. All 30 route/width combinations kept the document within the viewport. Screenshots and measured style/geometry observations are retained locally under ignored `.tools/ui-audit-baseline/`; no account state is captured.

| Observed issue | Evidence | Consequence |
| --- | --- | --- |
| Critical mobile text shrinks substantially | Tracker titles 11px, statuses 9px; Insights metric labels 10px and denominators 9px; experience minimums 9px | Users must magnify information needed to choose or track a role. |
| Some secondary text has weak contrast | Mobile experience minimum 2.89:1, pipeline labels 3.17:1, Insights context 2.43:1 and chart scale 1.70:1 in the captured light theme | Important context is difficult to distinguish. Ratios come from computed foreground and composited ancestor background colors. |
| Important mobile controls are small | Status select 29px high, primary action 34px, bottom navigation links 38px and dialog close 34×34px | Controls offer small touch targets. |
| Next steps disappear from mobile tracker rows | `.tracker-next` is hidden in the baseline mobile layout | A user must open a role to inspect or act on its next step. |
| Icon-only controls lose their names | Discovery Filters and Group by company hide their text without an accessible name | A screen reader cannot identify their purpose. |
| Typography shrinks table data to fit | Role-family table headers 7px on mobile | Keeping four columns onscreen harms legibility. A readable table with contained, keyboard-accessible scrolling is preferable. |

The baseline has no Kanban view; the selected product deliberately uses tracker rows, company grouping and next steps. No missing Kanban functionality is claimed.

## Focused regression coverage

`tests/e2e/responsive-ui.spec.ts` checks critical persistent text at a minimum 14px across the five widths, mobile form fields at 16px, selected navigation/status/next-step/close controls at 44px, complete long tracker titles and reachable next actions. It also checks modal keyboard containment, Escape/focus return, a close button that remains reachable after scrolling the form, saving preferences from the preferences step, and a readable role-family table with contained keyboard scrolling. These are targeted functional regressions, not an assertion that every text node or link must share one size.

The regressions also check a real anonymous sign-in header without clicking sign-in, legible selected role/period labels, and a 320px preferences footer whose Back, Continue and Save actions remain at least 88px wide, onscreen and no more than two text lines. Today priorities initially stay collapsed; their complete queue remains linked outside the disclosure, and the priorities can be expanded and collapsed with the keyboard. Compact job cards retain keyboard access to experience evidence and the original description.

## Observed results after the changes

The final local Chromium run passed **13/13 browser workflows in 54.2 seconds**, including the five new responsive regressions and eight existing end-to-end workflows. The scope includes fictional demo data and the anonymous local configuration state; it is not authenticated cloud acceptance. The final shared checks also passed lint, strict TypeScript, build, 332 unit tests in 21 files, the 101-record quality regression and 183 PostgreSQL WASM assertions. Actual disposable Supabase integration remains a separate CI gate.

The stable screenshot/style audit completed at **08:48:51 UTC on October 22** with **57 local scenarios**: three routes at five widths; scrolled job cards and tracker rows; filters, details, manual entry, preferences, coverage, grouped companies, next steps, task editing and data controls at 1440/390/320; plus reflow and text-enlargement cases. Motion was reduced and screenshots waited for finite animations to finish. Both viewport images and full-page references are retained in ignored `.tools/ui-audit-local-final/`. The job-card, tracker-row, detail-sheet and 320px preferences-footer viewport captures were visually reviewed at their actual widths.

- No document-wide horizontal overflow, clipped critical titles or browser runtime errors were recorded.
- The computed-color check found no scanned text below a 4.5:1 contrast ratio in these captured light-theme states. This check composites ancestor background colors; it does not certify every possible state, image, browser or accessibility requirement.
- Measured non-checkbox buttons, links, summaries and form fields in the captured states met the 44px target dimensions. Checkbox indicators are intentionally excluded from that geometry summary; their associated labels remain the interaction surface.
- Critical text met the 14px regression threshold, with mobile inputs at least 16px. Smaller 12px text remains for short redundant labels, counts and eyebrows.
- The Insights table scrolls within its labelled region at narrow widths and responds to keyboard arrows. Its offscreen columns do not make the document wider. Closed native disclosures can retain offscreen layout boxes, which are not treated as page overflow.
- All three routes stayed within a 640px effective layout, corresponding to the reflow space of a 1280px display at 200% zoom. A separate scripted doubling of computed text sizes at 1280px also produced no document overflow. This is a browser layout stress test, not a claim that native browser zoom was operated on a physical device.

The native Today disclosure, visible mobile tracker next steps, persistent modal header, restored keyboard focus, readable table and wrapped form actions address the observed baseline issues. Real Google OAuth, operating-system assistive technology, physical touch devices, cross-browser acceptance and a human usefulness pilot remain outside this local review. Human testing remains explicitly deferred; no participants or outcomes are invented.
