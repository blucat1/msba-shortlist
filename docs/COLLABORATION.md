# Owner control and teammate development

`blucat1` owns the repository and production accounts. Selected teammates may later receive repository **Write** access to push development branches and open pull requests. They do not need Supabase, Cloudflare, Google Cloud, billing access, or shared account passwords to contribute.

**Applied and verified:** owner controls were bootstrapped on [`6a796f4`](https://github.com/blucat1/msba-shortlist/commit/6a796f4bfd51db76aeccca07e1ef481fa4a6398d). GitHub and Cloudflare settings were checked on **October 21, 2026 at 22:39 PDT / October 22 at 05:39 UTC**; GitHub rules, access, and secret names were independently rechecked at **22:42 PDT / 05:42 UTC**. `blucat1` is the only repository collaborator, with Admin access; no teammate invitations were sent. These observations cover the controls described here, not a test using a real teammate account. See [TEST_REPORT.md](TEST_REPORT.md) for the broader verification record.

## Access and release model

| Resource | Owner | Teammates after a Write invitation |
| --- | --- | --- |
| GitHub repository | Owns settings, access, and release decisions | Push feature branches, open/review PRs, work with issues and Actions |
| Protected `main` | Reviews changes and performs the final merge after required checks | Cannot update `main`, including merging an approved PR |
| Production accounts and billing | Retains account administration and billing decisions | No dashboard memberships or credentials granted by this setup |
| Development data | Maintains the live service | Uses fictional demo or disposable local/test Supabase |

Write access is a trust decision. Writers can modify branch code and workflows, run/cancel/rerun Actions, and consume repository CI resources. They are not account administrators, but Write does not mean “can only edit the UI.” If tighter operational isolation is needed later, revoke upstream Write and use public forks plus pull requests. [GitHub access permissions](https://docs.github.com/en/get-started/learning-about-github/access-permissions-on-github)

Cloudflare production remains tied to `main`. Its preview branch setting was verified as **`none`**, with production build/environment settings preserved. An owner merge can publish the frontend automatically; development branch pushes do not automatically build previews in the owner's hosting account. Supabase migrations, Edge Function releases, OAuth changes, secrets, and provider-plan changes remain separate owner actions.

## Protect `main` with two rulesets

Two active rulesets target `refs/heads/main`. Free public repositories support these rulesets. [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)

1. **[Mandatory checks and pull requests — `25615135`](https://github.com/blucat1/msba-shortlist/rules/25615135):** requires the GitHub Actions checks `checks` and `supabase-authorization` from app `15368`, with strict up-to-date checking; blocks force pushes and deletion; requires a PR and resolved conversations. It has **no bypass actors**. Its baseline PR rule requires zero approvals; owner review is enforced by the other ruleset.
2. **[Owner review and release — `25615669`](https://github.com/blucat1/msba-shortlist/rules/25615669):** requires one approving review, code-owner approval, stale-approval dismissal after new commits, and resolved conversations. Its update restriction prevents writers from updating `main` even after approval. Only the repository admin can bypass this ruleset **through a pull request**, allowing the owner to perform the final merge, including their own work. The separate mandatory CI ruleset still applies.

Both PR rules set `require_extra_approval_for_unattributed_changes:false`, avoiding an additional approval that could block the owner's own PR. GitHub did not support the requested review-dismissal restriction, so this setup does not claim that writers cannot dismiss reviews. The separate owner-only update restriction still prevents them from releasing changes.

The [CODEOWNERS file](../.github/CODEOWNERS) is `* @blucat1`, including ownership of the CODEOWNERS file itself; GitHub returned an empty CODEOWNERS error list. Teammates' approvals do not replace owner approval. GitHub evaluates the target branch's CODEOWNERS, so changing it in a feature branch does not remove the existing review requirement. CODEOWNERS assigns review responsibility; it does not determine copyright ownership. [Code-owner behavior](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

The JSON files in [`.github/governance/`](../.github/governance/) are reviewable settings templates, not automation. A PR changing them does not change GitHub's active rulesets. The owner must apply any approved settings through GitHub's dashboard/API and read them back to verify the result. Repository administration can also change rules later; the ruleset's lack of merge bypass does not remove the owner's administrative authority.

The owner still reviews code before merging, especially scripts, dependency changes, migrations, workflows, and anything executed by production ingestion. Passing checks cannot establish that newly changed test definitions are adequate.

## Restrict production ingestion credentials

Repository-level Actions secrets are usable by collaborators' workflows. Protecting only the existing ingestion workflow is insufficient when writers can add another workflow. [GitHub secret access](https://docs.github.com/en/code-security/reference/secret-security/secret-types)

The GitHub environment **`production-ingestion`** is configured with `protected_branches:false`, `custom_branch_policies:true`, and exactly one policy: `name:"main", type:"branch"`. No tag policy is allowed. Its secret names are `SUPABASE_URL` and `SUPABASE_SECRET_KEY`; the repository-level secret list is **empty**. Keep privileged values out of frontend variables, source files, logs, PRs, screenshots, and teammate machines. [Environment restrictions](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)

The [ingestion workflow](../.github/workflows/ingest.yml) references this environment and requires both the literal `main` ref and the default-branch ref. Its twice-daily schedule remains automatic without per-run manual approval. Manual dispatch requires both `github.actor` and `github.triggering_actor` to be `blucat1`; reruns require owner `github.triggering_actor`. A scheduled event is automatically allowed only on its first attempt. Checking only `github.actor` is insufficient because reruns retain the original actor's privileges. Development branches cannot use this environment. [Rerun behavior](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)

After the repository-level secret copies were removed, [production ingestion run `39727386934`](https://github.com/blucat1/msba-shortlist/actions/runs/39727386934) succeeded using the secured workflow on `6a796f4`. [Bootstrap CI run `39727100360`](https://github.com/blucat1/msba-shortlist/actions/runs/39727100360) passed both `checks` and `supabase-authorization`. These runs verify owner execution with the new setup; they do not substitute for a future teammate-account denial test.

CI remains credential-free with read-only repository permissions. Fork workflow approval is configured as **`all_external_contributors`**. Do not introduce `pull_request_target` that checks out or executes untrusted PR code with privileges.

## Usage, costs, and recovery

Keep provider plans on the approved free configuration and leave paid add-ons disabled. Review actual Supabase usage, Cloudflare builds, and GitHub billing/usage; use provider spending controls where available. A budget notification is not necessarily a hard spending cap. Public repositories using standard GitHub-hosted runners currently have free execution, while other runner/storage choices or a switch to private can change billing. Writers can run Actions, and any resulting bill belongs to the repository owner. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

Cloudflare's account billing API returned **403**, so account-wide paid subscriptions were not verified. Disabling this site's preview builds and limiting production access does not establish an account-wide spending cap or prove that unrelated subscriptions are free.

Owner approval controls deployed changes and administrative access. It cannot cap all public-site activity: visitors can load the app, read the public catalog, and sign in to use their own tracker records. Publishable browser configuration is intentionally public; private-data protection depends on grants and RLS. Free quotas may cause limits or service interruption. Recheck current [Supabase pricing](https://supabase.com/pricing) and [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/) before expanding the pilot or changing plans.

To remove a teammate's operational access, revoke their repository invitation/access; their existing code contributions remain in history. A public repository can be copied or forked, so repository controls cannot retract downloaded code or promise exclusive authorship of teammates' contributions. Keep release authority separate from those questions.

If access is misused, revoke it, cancel active workflows, and pause the affected automation through the owner account. Inspect relevant changes before resuming. Rotate any credential that may have escaped its server environment; keep private user records intact. Record actual actions and results in the test report rather than assuming a protection worked.
