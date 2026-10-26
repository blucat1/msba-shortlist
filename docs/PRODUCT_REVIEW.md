# Product, workflow and visual review

Review date: **October 26, 2026**. Scope: Opportunities, My Search, Insights, their supporting dialogs, browser behavior and delivery process. The [master brief](../MSBA_Shortlist_Codex_Master_Prompt.md) remains the product boundary.

The application has a useful foundation: sourced discovery, a private tracker and historical analytics connected through three understandable destinations. The largest problems were failures of feedback and information hierarchy. A future application date could be confirmed, a failed initial save could appear to do nothing, a preferences refresh could erase a draft, and exact-time tasks could look undated. The visual treatment also gave decorative surfaces and repeated controls more attention than the next useful action.

This revision addresses those problems while preserving existing work, the three primary routes, source uncertainty, private history and isolated demo storage. It does not add another product area or change database authorization.

## What was reviewed

The review combined the brief and implementation with local Chromium workflows at desktop and phone sizes, focused failure and persistence checks, existing regression suites and an anonymous inspection of the hosted site. The hosted inspection opened all three primary routes, observed zero browser runtime errors and made no personal-record writes.

The public hosted release and the working checkout are distinct evidence. The checkout already contained unfinished recommendation changes when this review began. Local findings and screenshots refer to that working implementation; an anonymous first visit to the hosted site cannot establish that the local changes have shipped. No deployment was performed as part of this task.

## Priority problems addressed

| Problem | Why it mattered | Resulting behavior |
| --- | --- | --- |
| Application date constraints were only an input attribute, and the first save could fail silently. | A confirmation could create inaccurate dated activity or leave the user unsure whether anything saved. | Confirmation validates a real date no later than today in the selected timezone, presents an inline error, retains the date and reports save failures. Opening a listing remains separate from confirming a submission. |
| Repeated reminder acceptance and card actions lacked an immediate guard. | Rapid clicks could create duplicate tasks or issue overlapping mutations before the snapshot refreshed. | Pending states and in-flight guards protect those actions; reminder retries retain a stable task identity. |
| Settings reinitialized on every preferences snapshot. | A background refresh or failed save could erase unsaved edits and import previews. | A dialog initializes on opening or identity change, preserves its draft during refresh, and shows preference validation beside the controls. |
| Task presentation and sorting ignored exact timestamps. | A timed interview could show “Not set” and sort behind later work. | Tracker rows, detail views and next-step sorting account for exact times and timezone semantics; snoozed work has clearer due-state treatment. |
| Empty tracker results implied the user had no saved jobs. | Filters could hide existing records while the interface encouraged adding more. | Filtered-empty and genuinely empty states differ, with a visible result count and clear-filter action. |
| Route changes retained a generic title and old focus position. | Keyboard and assistive-technology users had little confirmation that a new screen opened. | Primary pathname changes update the document title and focus the main content. Query-based search and detail changes retain their own focus. |
| A rendering failure could leave a blank application. | Recovery depended on knowing to reload without guidance. | A rendering boundary offers a generic recovery screen, reload and an Opportunities link without displaying exception details. |
| Mobile Settings occupied a fourth bottom-navigation action. | The three primary destinations competed with a secondary control. | Bottom navigation contains three route links; Settings remains available in the header. |

The UI also now shares the domain layer's credential-free HTTP/HTTPS URL policy. Live snapshot refresh on returning to the tab helps keep feed health and recommendations from remaining indefinitely frozen at an earlier visit.

## Discovery and recommendation journey

The strongest part of discovery is its distinction between source evidence, personal preferences and unknown requirements. A source's missing experience figure still means unknown. A one-year requirement still represents positive experience. An external application click still does not become an application event. Those distinctions are more valuable than a more confident-looking score.

The existing shortlist and full-listing views serve different tasks and remain within Opportunities. Recommendation adjustments retain their preview/apply flow, while listing filters remain independently understandable. Cards keep the company, title, location, compensation and primary action prominent, with more evidence available through the role details and disclosures. Save and dismiss actions now communicate that a change is in progress. Application links explain that submission must be confirmed separately.

The resume journey retains focus on the report after an explicit Analyze action, helping users reach the extracted profile they must review. A failed replacement import now preserves the previously reviewed resume; confirmation and use are disabled while a replacement is being read. File support and privacy details remain available without dominating the working area. Resume text remains local to tab memory, requires review before matching, and is excluded from cloud persistence, URLs and tracker backups.

Coverage remains a substantive limit. Connected employer feeds and the rolling remote-market feed describe a bounded catalog, not all available jobs. Wider search opens external results that have not been imported or verified. Empty, stale and ambiguous results must continue to explain that boundary; introducing sample jobs into live discovery would hide the problem and is prohibited.

## Tracking and application process

My Search should answer three questions quickly: what is this role, where does it stand, and what happens next? Its current row structure supports that task. The changes improve the less common cases that undermine trust: a timed task, a filtered-empty list, a repeated reminder click and a new next step that should offer Cancel rather than deletion of an unsaved record.

Manual company edits now keep the default grouping key aligned when appropriate, while preserving deliberate custom grouping. Source snapshots, historical stage events and personal notes remain separate from shared catalog updates. A closed employer listing does not remove the tracked context or change an application's stage.

Confirmation now has a reviewable failure path as well as a success path. A rejected future date leaves persistent demo records unchanged; correcting it allows one submission event and one accepted reminder. These are behavioral checks, not claims that a real employer received an application.

## Insights and interpretation

Insights already distinguishes current pipeline counts from outcomes in an application-date cohort. That model is appropriate and remains intact. Historical Interviewing and Offer events continue to count even after a role is rejected. Unknown application dates remain excluded from dated cohorts, and a zero denominator remains an em dash.

Several labels needed to explain their scope more precisely. The 14-day option now explicitly applies to conversions, the role-family table names its cohort, and the weekly chart says that only weeks with submissions are displayed. This avoids implying a continuous calendar with visible zero-activity weeks. An empty personal tracker now provides a direct way back to discovery instead of presenting only empty metrics.

Small samples, incomplete histories and different application strategies still limit interpretation. The application describes recorded activity; it does not establish employer hiring odds, causal effects of a skill, or the relative quality of two career paths.

## Preferences, imports and privacy

The three-step preferences structure remains suitable for a short, optional setup. Opening it now starts at a predictable first step, and validation failures keep the user's work available. Import file reads also discard obsolete results when a later selection or dialog lifecycle makes them irrelevant, reducing the chance of presenting the wrong preview.

JSON remains the complete backup format and CSV the simpler interchange format. Preview, duplicate handling, owner remapping and demo provenance remain necessary safeguards. Imported fields and private notes should never be treated as verified public-job facts. The review did not weaken row-level security, child ownership constraints, caller checks, secret separation or the separation between fictional demo data and live accounts.

Privacy and coverage explanations are available from the existing secondary dialogs. Their presence is useful, but does not replace the operator's remaining audience and account-switch acceptance work.

## Visual hierarchy and accessibility

The prior combination of blue accents, decorative scene artwork, strong translucent surfaces, large headings and many pill controls created unnecessary competition. The revised treatment uses a warm light canvas, white reading surfaces, forest-green actions, quieter borders, smaller headings and a consistent distinction between navigation, content and controls. The decorative background is hidden. Card and tracker content carry the visual emphasis.

The established desktop rail, compact phone header, local font assets and custom glass infrastructure are retained for compatibility. Their visual treatment has been simplified; this task is not a removal of every older style layer or rendering subsystem. The remaining layers make styling harder to reason about and deserve a deliberate cleanup after this revision is accepted.

Visible keyboard focus, meaningful field labels, dialog focus return, sufficiently large navigation controls and readable status text remain part of acceptance. The mobile recovery regression also checks that search retains focus while its query changes and that navigation updates focus and title without document overflow. Existing reduced-motion and protective surface behavior remains relevant. Chromium checks and screenshot inspection do not certify screen-reader usability, Safari/Firefox output or physical-device graphics performance.

## Delivery evidence and next priorities

Final local verification passed **499 unit tests across 34 files**, all **41 Chromium browser tests against the production bundle**, lint, strict type checking, production build and the existing **101-record** quality benchmark. Browser assertions were repaired to wait for rendered state and animation completion, and a snooze scenario now derives a future date rather than expiring with the calendar. See [TEST_REPORT.md](TEST_REPORT.md) for executed commands, screenshots, repairs and verification boundaries.

Before wider rollout, deploy the verified local state through the established release process and verify the resulting hosted version. This task does not claim a new deployment, new signed-in two-account OAuth acceptance, same-browser account-switch acceptance, second-device persistence, or an independent user study. Earlier hosted and database evidence retains its original date and scope; PostgreSQL smoke tests are not hosted Supabase or Google OAuth acceptance.

The next useful product evidence is a small observed study of the existing core loop: find a suitable role, understand its evidence, save it, confirm a submission and schedule a next step. Record hesitation, errors and whether the user can explain the match and its uncertainties. The existing deferred pilot materials can support that work without inventing participants or feedback.

Later engineering cleanup should consolidate the inherited styles into shared tokens and component rules, retain meaningful accessibility and lifecycle regressions, and separate optional optical checks from the core application acceptance signal. Improve discoverability and source coverage only through approved public endpoints and documented usage review. None of these priorities requires a paid service, an LLM API, arbitrary-URL scraping or another primary route.
