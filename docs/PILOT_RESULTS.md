# Pilot results

**Human pilot status: deferred by the owner; not executed.** This document contains no participant findings. The May 15, 2027 graduating cohort is available to start May 16, 2027 or later.

| Evidence area | Current result |
| --- | --- |
| Recruitment and consent | Not started; no classmates invited or counted. |
| Two independent Google accounts | Not executed. Earlier owner-reported single-account sign-in/save/refresh is not a substitute. |
| Same-browser account-switch and pending-request cache isolation | Human Google-account observation not executed. Automated local authorization/session checks must be reported separately. |
| Second physical device | Not executed. Responsive browser checks do not establish this. |
| Participant backup/restoration and failure recovery | Not executed. Existing automated tests do not count as participant task completion. |
| Shortlist usefulness and cohort start-date fit | No participant labels collected; no relevance percentage established. |
| Coverage misses | No participant-submitted examples reviewed. No whole-market coverage claim. |
| Time saved | No paired sessions; no time-saving claim established. |
| Continued use | No follow-up scheduled or performed; no retention result. |

The [pilot protocol](PILOT_PROTOCOL.md) and [empty results template](../data/pilot-results.template.json) are ready for a later owner-authorized session. Classmate participation is explicitly deferred and does not block the authorized engineering work. Do not recruit, send messages, request account access or populate participant outcomes now.

Observed technical checks belong in [TEST_REPORT.md](TEST_REPORT.md), with exact commit/time and execution environment. A local integration pass can establish captured-feed ingestion, local Auth/REST/SQL, persistence, backup and representative browser behavior. It cannot establish real Google OAuth, two people's account switching, physical-device behavior, usefulness or time saved.

When the owner resumes testing, replace this status with consented aggregate results and their denominators. Keep participant-level entries and any identity/consent mapping outside Git, record skipped/failed steps, and retain the protocol's original decision criteria. Until then, all human criteria remain **unverified**.
