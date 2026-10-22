# Owner control and teammate development

`blucat1` owns the repository and production accounts. Selected teammates may later receive repository **Write** access to push development branches and open pull requests. They do not need Supabase, Cloudflare, Google Cloud, billing access, or shared account passwords to contribute.

**Verification status:** the settings below describe the intended configuration. This document alone is not evidence that a setting has been applied. Record the actual settings, verification date, and relevant run/PR links in [TEST_REPORT.md](TEST_REPORT.md) before inviting writers. No teammates are being invited during this setup.

## Access and release model

| Resource | Owner | Teammates after a Write invitation |
| --- | --- | --- |
| GitHub repository | Owns settings, access, and release decisions | Push feature branches, open/review PRs, work with issues and Actions |
| Protected `main` | Reviews all changes; merges approved, passing PRs | Cannot bypass owner approval or required checks |
| Production accounts and billing | Retains sole administrative access | No dashboard memberships or credentials |
| Development data | Maintains the live service | Uses fictional demo or disposable local/test Supabase |

Write access is a trust decision. Writers can modify branch code and workflows, run/cancel/rerun Actions, and consume repository CI resources. They are not account administrators, but Write does not mean “can only edit the UI.” If tighter operational isolation is needed later, revoke upstream Write and use public forks plus pull requests. [GitHub access permissions](https://docs.github.com/en/get-started/learning-about-github/access-permissions-on-github)

Keep Cloudflare production deployments tied to `main` and disable automatic preview builds for other branches. An owner merge can publish the frontend automatically; branch pushes must not publish to the owner's hosting account. Supabase migrations, Edge Function releases, OAuth changes, secrets, and provider-plan changes remain separate owner actions.

## Protect `main` with two rulesets

Use active rulesets targeting the default branch. Free public repositories support these rulesets. [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)

1. **Mandatory checks and branch protection:** require the GitHub Actions checks `checks` and `supabase-authorization` from app `15368`, require the branch to be current, block force pushes and deletion, and require changes through a pull request. Give this ruleset no bypass actors. A baseline PR rule can require zero approvals here; owner review is enforced separately.
2. **Owner review and release:** require one approving review and code-owner approval; dismiss stale approvals after new commits; resolve review conversations; restrict dismissal of reviews to `blucat1`. Restrict updates to the branch, with fetch-and-merge updates disabled. Only the repository admin may bypass this ruleset **through a pull request**, so only the owner can perform the final merge, including their own work. This bypass must not cover the separate mandatory-check ruleset.

Keep `.github/CODEOWNERS` as `* @blucat1`, including ownership of the CODEOWNERS file itself. Teammates' approvals do not replace owner approval. GitHub evaluates the target branch's CODEOWNERS, so changing it in a feature branch does not remove the existing review requirement. CODEOWNERS assigns review responsibility; it does not determine copyright ownership. [Code-owner behavior](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

The owner still reviews code before merging, especially scripts, dependency changes, migrations, workflows, and anything executed by production ingestion. Passing checks cannot establish that newly changed test definitions are adequate.

## Restrict production ingestion credentials

Repository-level Actions secrets are usable by collaborators' workflows. Protecting only the existing ingestion workflow is insufficient when writers can add another workflow. [GitHub secret access](https://docs.github.com/en/code-security/reference/secret-security/secret-types)

Create the GitHub environment **`production-ingestion`** and select a deployment policy allowing only the **branch** named `main`. Use `protected_branches:false`, `custom_branch_policies:true`, and a policy with `name:"main", type:"branch"`. Do not allow tags or all protected branches. Put `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in this environment, then delete their repository-level copies before granting Write access. Keep all privileged values out of frontend variables, source files, logs, PRs, screenshots, and teammate machines. [Environment restrictions](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)

The ingestion job must reference this environment and use trusted code from `main`. Allow the existing twice-daily schedule without per-run manual approval. Allow manual dispatch only by `blucat1`; allow reruns only when `github.triggering_actor` is `blucat1`. A scheduled event is automatically allowed only on its first attempt. Checking only `github.actor` is insufficient because reruns retain the original actor's privileges. A run from a development branch must remain blocked even when it names the production environment. [Rerun behavior](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)

CI must remain credential-free and use read-only repository permissions. Require owner approval before workflows from external fork contributors run. Do not introduce `pull_request_target` that checks out or executes untrusted PR code with privileges.

## Usage, costs, and recovery

Keep provider plans on the approved free configuration and leave paid add-ons disabled. Review actual Supabase usage, Cloudflare builds, and GitHub billing/usage; use provider spending controls where available. A budget notification is not necessarily a hard spending cap. Public repositories using standard GitHub-hosted runners currently have free execution, while other runner/storage choices or a switch to private can change billing. Writers can run Actions, and any resulting bill belongs to the repository owner. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

Owner approval controls deployed changes and administrative access. It cannot cap all public-site activity: visitors can load the app, read the public catalog, and sign in to use their own tracker records. Publishable browser configuration is intentionally public; private-data protection depends on grants and RLS. Free quotas may cause limits or service interruption. Recheck current [Supabase pricing](https://supabase.com/pricing) and [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/) before expanding the pilot or changing plans.

To remove a teammate's operational access, revoke their repository invitation/access; their existing code contributions remain in history. A public repository can be copied or forked, so repository controls cannot retract downloaded code or promise exclusive authorship of teammates' contributions. Keep release authority separate from those questions.

If access is misused, revoke it, cancel active workflows, and pause the affected automation through the owner account. Inspect relevant changes before resuming. Rotate any credential that may have escaped its server environment; keep private user records intact. Record actual actions and results in the test report rather than assuming a protection worked.
