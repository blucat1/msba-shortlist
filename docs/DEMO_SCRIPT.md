# Two-minute MSBA Shortlist demo

Preparation: run `npm ci`, then `npm run dev`, and open the `/demo` route printed by Vite (normally `http://127.0.0.1:5173/demo`). No cloud credentials are needed. For a clean sample, open Settings & preferences → Data & account → Reset demo and confirm. Close Settings. The sample has 30 fictional jobs, 12 tracked opportunities, and simulated dates generated relative to the first demo visit. Browser storage preserves those dates and edits across refreshes.

| Time | Show and say |
| --- | --- |
| 0:00–0:20 | Point out **Demo — sample jobs; changes stay in this browser.** On Opportunities, open any unsaved role. Read a match reason and an experience or compensation caveat. Explain that labels describe stated preferences and source evidence, never a hiring probability. |
| 0:20–0:45 | Save that role. Choose **Open application** and show the labeled demo interaction. Choose **Not yet** first: this is still Saved. Open it again and choose **Yes, I applied** with the actual selected demo application date. No application has been submitted to an employer. |
| 0:45–1:05 | Open My Search and find the role just saved. Change its status to Assessment or Interviewing. Open its details and show the new history event. Assessment and Interviewing are distinct stages. |
| 1:05–1:20 | Switch to Next steps and complete an open step. Open another step to show edit/snooze controls. Suggestions create a reminder only after the user accepts them; the app sends no emails. |
| 1:20–1:35 | Return to Opportunities view inside My Search and choose **Group by company**. Find Juniper Metrics: its two applications retain separate titles, stages, and histories, with one private company note. |
| 1:35–1:50 | Open Insights. Show submitted applications, the displayed interview numerator/denominator, and current pipeline. Explain that historical interviews still count after a later rejection. Toggle the 14-day maturity filter: it narrows conversion cohorts, without pretending to correct statistics. |
| 1:50–2:00 | Refresh and reopen My Search to show the saved role persisted. State one limitation: the live catalog covers selected public employer feeds, so people can add outside opportunities manually. Demo activity never merges into a real account. |

Optional after the timed walkthrough: Settings → Data & account → Export JSON; import the same file, review the duplicate count, then confirm. Existing duplicates and their tasks/history remain unchanged. CSV is a spreadsheet-friendly view; JSON is the complete backup format.

## Record a real test and change

No participant or feedback is claimed by this repository. The team should fill this section after an actual session.

- Test date, device, and browser: _not recorded_
- Person conducting the test: _not recorded_
- Observed behavior or participant feedback: _not recorded_
- Concrete change made after that observation: _not recorded_
- Verification after the change: _not recorded_

Use `docs/TEST_REPORT.md` for executed automated checks and explicit checks that still require external setup. This walkthrough is a presentation guide, not evidence that OAuth, deployment, or database isolation has been tested.
