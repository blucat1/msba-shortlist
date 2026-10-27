# Draft Board pilot protocol

**Status: prepared; human testing deferred at the owner's request.** No classmates have been recruited, invited, observed or counted by this protocol. Choose dates only when the owner resumes the pilot. The protocol is a plan, not evidence that the product is useful or that Google account isolation has passed.

The target cohort graduates **May 15, 2027** and can start work **May 16, 2027 or later**. Record dates in `America/Los_Angeles`; retain the exact timezone of an employer's stated deadline/start requirement. A listing with missing dates is not evidence that the employer will wait for this cohort.

## Before scheduling people

1. Finish the automated checks described in [integration testing](../tests/integration/README.md), the existing unit/browser tests and the real Supabase authorization suite. Record exact commit, commands, time and outcomes in `TEST_REPORT.md`. Local password-account tests do not establish Google OAuth, same-browser cache isolation or a second physical device.
2. Recheck the live site's three routes, current source health, conservative experience/start-date labels, privacy/export/deletion controls and owner contact. Keep the application on the approved free services. Freeze the tested commit during each comparison session; record any intervening deployment.
3. When testing is resumed, ask up to four willing cohort members to participate. At least two participants must use **independent Google accounts**. Each enters their own credentials privately. Never share account passwords, OAuth tokens or a Supabase/Cloudflare administrator login.
4. Use the consent text below before collecting any measurements. Participants may test without submitting notes, job-search history or a resume. Do not record screens/audio, install analytics, send invitations or create calendar events through this protocol.
5. Copy [the empty results template](../data/pilot-results.template.json) into an ignored owner-controlled location such as `.tools/pilot-private/`. Keep identity/contact/consent records separately from pseudonymous measurements. Do not commit completed participant rows or backup files.

## Optional participation and minimal collection

Suggested invitation/consent wording for the owner to use **later**, after the pilot is resumed:

> This optional test checks whether Draft Board helps students graduating May 15, 2027 find suitable roles and maintain their own search. You control your Google sign-in and private tracker. I will collect only a participant alias, task outcomes/times, counts of suitable or missed roles, ratings and any brief feedback you choose to share. Please omit passwords, email addresses, resumes, application notes and sensitive employer details from feedback. There is no hidden analytics or screen recording. You may skip any task, stop, or ask me to remove your identifiable pilot responses before aggregate results are published. Participation has no effect on coursework or access to the app.

Use aliases `P01`–`P04`, not initials or email addresses. Record consent as a boolean and date; never copy a signed document into this public repository. Participant-specific entries stay private for at most **30 days after the pilot ends**, then are deleted after producing consented aggregate findings. Participants control their app data and backups independently; app account deletion is not the same as withdrawing owner-collected pilot feedback. If consent is not given, collect no participant measurements.

## Session procedure

Allow approximately 35–45 minutes, with breaks and optional tasks. Record the deployment SHA, test date, device class, browser family, and broad role/location preferences chosen by the participant. Do not record an exact device identifier, employer application history or any Google account identifier.

| Check | Procedure and observation |
| --- | --- |
| Google account A | A participant signs in with their own Google account on a fresh browser profile. Save two **real** catalog roles; refresh My Search and reopen one. Verify company, source credit, stage and notes they deliberately entered. Observe outcomes without copying private content. |
| Explicit application action | Open the source link and return: the role must still be Saved. Confirm an actual application only if one was submitted; otherwise inspect the confirmation and cancel. Do not fabricate a submission or date to pass a test. |
| Tracker workflow | Edit a deliberate next step, due date and priority; complete the next step. Check date-only behavior in the participant's timezone. Stage/history tests must preserve uncertainty and distinguish an edit from a new application. |
| Backup and restoration | Export the participant's own backup locally. Validate its record/task counts and attribution; never upload or email its contents. If the participant chooses to test restoration, use only their own test saves, remove those deliberately after verifying the backup, then import it into their own account. Import again: duplicates must be skipped, with company grouping/source credit/history retained. Skip destructive restoration if the participant is not comfortable; record **not executed**, not passed. |
| Offline failure and retry | With the participant's permission, use the browser's network-offline control, try a reversible edit, and confirm that no success is claimed. Restore connectivity and retry once; inspect persistence after refresh. Keep form input/private state available after failure. Do not disable production feeds or change cloud policies for this task. |
| Same-browser account switch | Account A signs out fully. A second participant signs in as Google account B in the **same app browser context**. B must see none of A's notes, tasks, saved roles, preferences or company notes, including after Back/Forward and refresh. Reverse the switch; confirm A's records are intact. Stop if any prior private content flashes or remains. Each person operates their own Google account; do not share credentials. |
| Pending-request switch | On a controlled test session, throttle network requests, start loading A's private tracker, sign out/switch to B, then let the requests finish. No A content may appear in B's UI. Remove throttling and repeat the normal refresh check. Record the actual outcome, including a brief flash if observed. |
| Second physical device | The same participant signs in on their own phone or a second computer. Confirm saved records and a newly completed next step agree across devices after refresh. A resized desktop browser or mobile emulator is **not** a second-device result. |
| Source failure behavior | The operator reviews an automated failed/partial-feed preservation check and current source-health display. A temporary source outage must retain existing private records and avoid false closure. A successful automated check is automation evidence; do not claim the participant caused or observed a real outage. |

Count each task attempted, successful, failed or skipped. A skip is not a pass. Do not ask participants to expose real application notes to make isolation easier to inspect; a participant-chosen harmless marker is sufficient.

## Shortlist usefulness and coverage

1. Set the participant's true role/location constraints and the cohort's graduation/start dates. Review the first ten default results, or all available results when fewer than ten exist. Record the denominator. Do not fill a short list with experienced, immediate-start or unverified roles merely to reach ten.
2. For each reviewed listing, the participant independently answers: “Would I seriously consider this role?”, “Can I plausibly meet the required experience/degree/location conditions?”, and “Does the employer's stated timing allow a May 16, 2027-or-later start?” Use `yes`, `no` or `unknown`; absent requirements are not zero and absent timing is not a future-start commitment.
3. Follow the authoritative source for any apparent contradiction. Record a short category such as `required_experience`, `mandatory_immediate_start`, `country`, `employment_type`, `closed`, or `unverified_source`; avoid copying full descriptions. An explicitly required 2+ years or a mandatory start before the cohort is ready is a strict-default contradiction, even if the title says junior.
4. Ask the participant to bring up to three currently open, relevant roles they found elsewhere. Classify each as: present; outside monitored coverage; intentionally excluded by a stated requirement; source detail unknown; or a plausible ingestion/classification miss. Record public posting URLs only with permission. Do not combine out-of-coverage jobs with true misses in a monitored feed, and do not describe this sample as recall across the entire job market.
5. Ask for ease of understanding on a 1–5 scale and whether they would choose to use the app again. Record one optional non-sensitive improvement request. Relevance ratings describe this cohort and observation date, not general hiring eligibility.

## Time comparison

Counterbalance order: odd aliases use their usual search method first; even aliases use Draft Board first. Give each condition the same role/location/cohort-start target and a **10-minute maximum** to find three roles the participant would seriously consider. Avoid repeating the identical job across both conditions. Record elapsed seconds, qualifying-role count and whether the condition hit the time cap. Do not ask for logins to another service or automate external applications.

Compare paired sessions only when both conditions produced three qualifying roles; separately report time-capped/unfinished conditions and useful-role counts. Report median within-person change with the number of valid pairs. A smaller workload or fewer useful results is not evidence of time saved.

If a later seven-day follow-up is voluntarily completed, ask how many days the participant chose to use the app and whether they would continue. This is a self-report, not a server-inferred retention metric. The current request does not schedule a follow-up or authorize messaging anyone.

## Predeclared decision criteria

These thresholds are pilot decisions, not scientific validation. Do not change them after inspecting results without documenting the change.

| Measure | Pass/readiness rule | Insufficient evidence or failure |
| --- | --- | --- |
| Privacy and session isolation | **Zero** observed cross-account exposures; both independent Google accounts and the pending-request switch pass. | Any exposure stops the pilot and requires a fix plus retest. Unexecuted Google/switch checks remain unverified. |
| Persistence and recovery | At least 90% of attempted critical workflow tasks succeed, with no acknowledged save lost after refresh and no failed operation falsely reported as saved. | Any data-loss/false-success issue blocks rollout. Skips remain outside the success denominator and are listed. |
| Second device | At least two independent accounts pass refresh/persistence on a second physical device. | Emulation or a single account does not satisfy this check. |
| Strict-default accuracy | No unambiguous contradiction of required experience, country, employment type, source availability or mandatory start before May 16, 2027 in the reviewed default sample. | Confirmed contradictions require a rule/data correction and re-evaluation; unknowns are reported separately. |
| Useful shortlist | At least 70% of reviewed roles receive “seriously consider: yes,” with at least five reviewed roles per participant and at least three participants. | Smaller samples are reported as counts/insufficient evidence; do not claim the threshold passed. |
| Missed roles | Every submitted role receives a documented coverage/eligibility explanation; plausible misses from monitored sources become reproducible issues. | This does not establish whole-market coverage or a whole-market recall score. |
| Time saved | At least three valid paired sessions; median time to three qualifying roles improves by at least 20%, without a lower qualifying-role count. | Report censored/unfinished sessions and insufficient pairs honestly. |
| Continued use | If the optional follow-up runs, at least three of four participants voluntarily report willingness to continue. | No response or no follow-up is unexecuted, not retention evidence. |

## Reporting and stop conditions

Update [PILOT_RESULTS.md](PILOT_RESULTS.md) only from observed, consented results. Separate automated local checks, hosted browser checks, Google human steps, usefulness and timing findings. Report counts and denominators before percentages; preserve negative findings. A single owner save/refresh result is not multi-user evidence.

Stop observation immediately for cross-account disclosure, lost acknowledged changes, exposed credentials or an unexpected paid-service prompt. Record only the issue category and reproduction steps without private content. The operator fixes and retests before resuming. Do not weaken authorization, upload backups, enable paid services, invite anyone or claim participant success to complete the protocol.
