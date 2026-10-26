# Flexible discovery and local resume comparison

**Shortlist** is a dedicated recommendation workspace. It shows five ranked groups at a time, positive reasons supported by recorded evidence, remaining unknowns, and clear Save/View actions. **Show more recommendations** adds five groups without changing their order. Exact location/requisition variants retain their own source, save and application actions.

Open **Adjust recommendations** to choose **Your preferences**, **Your resume**, or **Both**. The dialog previews the number of matching groups. **Update** applies the draft; **Cancel** leaves the current recommendations unchanged; Reset prepares the strict new-grad defaults but requires Update. Resume analysis opened from that dialog returns to the same unapplied draft, so reviewing a file does not silently apply unrelated edits. With no personal preference evidence, the page labels its initial results as a new-grad starting point.

Recommendation criteria use a whitelisted `rec-*` URL namespace. They do not change the unprefixed All listings search/filter/method settings. Resume text, extracted skills, confirmed qualifications and comparison profiles remain in memory and never enter either namespace. The card, reasons and role detail use the same effective comparison profile.

**All listings** retains its catalog interface and three methods: **Filters only** uses search controls and saved preferences; **Resume only** pauses those filters/preferences and compares open catalog roles across experience levels; **Resume + filters** filters first and orders remaining records by compatibility. Its **Filters** dialog retains the five everyday controls and advanced facets. Source contradictions and expired verified deadlines remain withheld by default in both views.

The original graduate default remains strict. All listings defaults to all experience tiers and uncertain scope and shows individual records rather than grouped programs. The explicit wider-scope filter reads additional relevant public records outside the graduate catalog; internships, contracts, international-only and leadership roles retain their warnings. It does not discover new feeds or establish entire-market coverage. The ordinary catalog has its existing 5,000-record cap. The additional public read is opt-in, limited to 1,500 compact records in 500-row pages, cached for five minutes, and reports its actual total and truncation. Full job descriptions remain on demand. A read-only live check on October 22 found 177 additional records; counts change with feeds.

Facets support several roles, work arrangements and employment types; alternatives within one facet use OR, while different facets use AND. Keywords support any/all words. Employer and source selection, explicit unknown experience/pay/date options, distinct original/publication/discovery date filters, and availability/freshness/conflict controls are available. Unknown experience is never zero. Salary compares published annual USD base minima without converting hourly or foreign-currency pay. Numeric and date constraints are validated, including query-string inputs. Filters remain inactive in Resume only and reapply when switching back to combined mode.

## Import and privacy

Resume files are read in the browser. Supported formats are UTF-8 TXT, ordinary DOCX, and selectable-text PDF, up to 5 MiB, 100,000 characters and 20 PDF pages. Encrypted PDFs, scans without extractable text, legacy DOC, ZIP64/encrypted DOCX archives, malformed XML and excessively expanded ZIP data are rejected with an explanation. DOCX import extracts only its document body, so headers, footers and text embedded as images may be absent. PDF extraction can lose visual reading order. Users review and edit extracted text before selecting Analyze resume.

PDF.js 6.4.299 is loaded only for PDF imports and uses a same-origin worker. fflate 0.8.3 reads bounded DOCX ZIP content. No arbitrary remote document URL, OCR, executable document macros, paid parser, LLM service or employer ATS account is used. The worker and library code are served by the site; document contents are not sent to them over a network.

Text and the comparison profile live only in the mounted workspace's memory. They are not placed in localStorage, sessionStorage, Supabase, tracker exports, analytics, logs or query parameters. Demo/live and authentication identity boundaries remount that memory. Remove resume, reload, sign out, account change and demo reset clear it. The feature is intentionally not a synchronized resume vault.

## Analysis and score

Analyze resume extracts bounded, word-aware skill/role mentions and shows their actual text evidence, recognized sections, contact-pattern presence, achievement wording and text-readability checks. Negated/future skills are excluded conservatively. Education text is evidence to review; completed education, degree field and professional years stay unknown until the user confirms them. Dates, internships and coursework are not summed into invented professional experience. Editing text invalidates analysis and profile; editing the profile requires review again before comparisons run.

Compatibility is a deterministic evidence-overlap score on a 0–100 scale:

| Dimension | Maximum weight |
| --- | ---: |
| Recorded required skills | 45 |
| Recorded preferred skills | 15 |
| Reviewed role interests versus recorded role/title family | 20 |
| User-confirmed experience versus unconditional numeric requirement | 15 |
| User-confirmed completed education versus recorded degree requirement | 5 |

Only assessable dimensions contribute to the denominator. A score requires at least 35 assessable weight points and two observable requirement units; otherwise it is unavailable. Evidence coverage is displayed separately. Unknown data does not earn a success point. Required skills missing from the reviewed profile are gaps to review, not proof of inability. Preferred skills do not become mandatory. Conditional degree/experience paths remain unverified. Known required qualification conflicts cap the score at 49 and display a conflict label even when keyword overlap is high. GPA, citizenship, sponsorship and other unsupported qualification evidence remain explicitly unverified.

The cards and details show matched/missing/unverified requirements, source evidence, observed-weight breakdown and review suggestions. Resume-only qualification differences are shown in that report rather than silently becoming personal search filters. All listings still offers Newest found sorting instead of compatibility sorting. Parsing checks and detailed score evidence are available in expandable reports.

This reproduces useful ATS-style steps—text extraction, structured review and a job-requirement comparison. It does not reproduce an employer's proprietary parser, role calibration, candidate pool or hiring process. For example, [Greenhouse documents recruiter-defined criteria and weights](https://support.greenhouse.io/hc/en-us/articles/41131886674075-Talent-Matching-FAQ). Its private configuration is not available here. No score claims employer acceptance, overall eligibility or hiring probability.

Implementation references: [PDF.js examples](https://mozilla.github.io/pdf.js/examples/), [fflate source and bounded ZIP interfaces](https://github.com/101arrowz/fflate). Package versions/integrities are locked; license notices are available from the site's Credits page. Tests and actual release verification are recorded separately in TEST_REPORT.md and the release pull request.
