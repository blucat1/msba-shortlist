# Conservative source-evidence recovery — October 26, 2026

This review investigates genuine extraction misses without treating unknown employment, remote eligibility, salary, benefits or graduate titles as proof. It does not establish production import, deployment or final hosted counts. Classifier version **2026-10-26.2** records the changed interpretation of source evidence.

## Explicit commitment in employer metadata

The [Greenhouse public Job Board API](https://docs.greenhouse.io/job-board.html) documents employer-exposed custom fields in `metadata`. Complete existing employer boards showed that the previous adapter ignored the explicit **Time Type** field because it selected only the first matching employment/commitment/job-type name. Examples include [Reddit posting 8282760](https://job-boards.greenhouse.io/reddit/jobs/8282760), [Datadog posting 8267546](https://careers.datadoghq.com/detail/8267546/?gh_jid=8267546) and [SoFi posting 8012077003](https://sofi.com/careers/job/8012077003?gh_jid=8012077003). Their public snapshots expose a full-time value in that field.

The adapter now reads a bounded set of exact commitment/type field names, including worker type/subtype and early-career type. It retains field labels and all scalar/string-list values as employment evidence. Contract, temporary/fixed-term, internship and part-time markers take precedence over full-time hours, regardless of field order. Reddit's fixed-term subtype and Datadog's internship subtype demonstrate why the first positive value must not win. Negated full-time values remain unknown. Other metadata, non-string objects, generic employee/regular status, weekly hours, pay and benefits do not establish full-time employment.

A replay of **27 complete existing approved employer snapshots / 6,434 raw rows**, measured at **23:33:53 UTC**, compared the previous committed normalizer with the revised adapter/normalizer on identical payloads:

| Diagnostic within these 27 boards | Before | After |
| --- | ---: | ---: |
| Supported catalog records | 481 | 481 |
| Explicitly included US/full-time records | 23 | 76 |
| Included new-grad/early-career records | 2 | 8 |
| Included new-grad records | 2 | 2 |

The **53 recovered scope records include six early-career listings**: four at Datadog and two at Reddit. None of those six became a zero-experience or new-grad role. Their source-stated numeric requirements and all independent profile/conflict checks remain. Within this selected subset, the anonymous default result count moved from two to eight before grouping. These figures are a bounded replay, not market-wide recall or final production totals.

SoFi's commitment is recovered, but its state-prefixed location remains unverified by the existing geography parser, so that example stays outside the strict shortlist. Missing employment evidence at other employers remains unknown: generic full-time benefits at Gusto/Oscar and Brattle's conditional visa-support language were not promoted. Explicit `Regular` metadata, including Pinterest's graduate posts, does not establish hours. No geography inference, annual-salary inference or new endpoint was added.

Temporary complete payloads and diagnostics remain outside Git at `/tmp/evidence-review-feeds`, `/tmp/evidence-review-excerpts.json` and `/tmp/source-evidence-recovery-results.json`. No Jobicy request, private data access or production write was performed for this review.

## Employer-specific entry-level recruitment

[West Monroe's student posting 6167515004](https://westmonroe.com/careers/job-details-students?gh_jid=6167515004) directly recruits entry-level consultants, although its title lacks the graduate label and it states no numeric experience floor. The classifier now recognizes this narrow direct-hiring construction at the beginning of a sentence: the actual employer's exact escaped name, or a first-person company/team subject, recruiting entry-level candidates to its own team. The normalizer supplies the actual hiring company when a publishing source provides one. Mentoring/managing juniors, benefits, unrelated employer references and negations do not establish graduate hiring.

The positive source phrase is retained as evidence. Numeric requirements, senior/leadership titles, conditional degree paths, qualitative experience requirements and explicit graduate exclusions retain their existing precedence. Graduate evidence does not manufacture zero years or full-time employment.

Replaying the complete **96-row West Monroe student snapshot** changed experience tiers for 45 rows. **Eleven supported records** moved from unverified experience to explicit graduate hiring while remaining **Needs details** because employment is unknown; 34 unsupported-role rows stayed excluded. The eleven include six data/analytics location requisitions and five platforms/business requisitions, rather than eleven independently verified programs. This replay does not add eleven qualified default recommendations. Degree, graduation, GPA, sponsorship and source availability remain separate checks.

## Observed checks

On Node **24.22.0**, **50 targeted unit tests** across the two new source-evidence suites and the ingestion suite passed. They exercise real metadata/phrase patterns plus conflicting commitment fields, fixed-term/intern/part-time exclusions, null/object values, negations, benefit boilerplate, independent geography, exact employer escaping, unrelated-company quotations, mentoring, numeric/senior/qualitative overrides and retained unknown employment/years. Strict typecheck and lint passed during implementation; the **101-record quality gate** passed classifier 2026-10-26.2 with zero mismatches. Parent release checks determine final full-suite, Supabase and hosted acceptance.
