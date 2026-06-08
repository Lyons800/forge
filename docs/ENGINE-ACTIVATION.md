# Engine Activation Checklist (owner-only)

This is the **owner's** runbook for turning on Forge's two-agent autonomous engine.
The two workflows (`.github/workflows/engine-implementer.yml`,
`.github/workflows/engine-reviewer.yml`) already exist on `main`, but they are
**inert** until you complete every step below. Specifically:

- Both jobs are gated `if: ${{ vars.ENGINE_ENABLED == 'true' }}`. Until you set
  that repo **variable**, every run is skipped and **incurs zero Anthropic
  metered cost**.
- `ANTHROPIC_API_KEY` (the metered credential) and the App credentials must
  exist as repo **secrets** before anything can run.

These steps require **your** GitHub account / billing, which is why they are not
automated. Do them in order. Everything is for the single repo `Lyons800/forge`.

---

## Step 0 — Prerequisites

- You are `@Lyons800` (repo owner / admin).
- `gh` CLI authed as `Lyons800` (`gh auth status`).
- Repo is `Lyons800/forge` (public). Branch protection on `main` already requires
  status checks `gate`, `migrations`, `control-plane-guard`.

---

## Step 1 — Create the "Forge Implementer" GitHub App

Settings → Developer settings → GitHub Apps → **New GitHub App**.

- **Name:** `Forge Implementer`
- **Homepage URL:** the repo URL is fine.
- **Webhook:** UNCHECK "Active" — **no webhook** is needed (the workflows trigger
  the action; the App is only an identity + token source).
- **Repository permissions** — set ONLY these, leave everything else "No access":
  - **Contents:** Read & write  (push `claude/*` branches)
  - **Pull requests:** Read & write  (open PRs)
  - **Metadata:** Read-only  (mandatory baseline)
- **Where can this app be installed:** Only on this account.
- Click **Create GitHub App**.
- On the App page, note the **App ID** (a number).
- Scroll to **Private keys → Generate a private key**. A `.pem` downloads. Keep
  it safe; you will paste its contents into a secret in Step 4.
- **Install App** (left sidebar) → install on **Only select repositories** →
  choose `Lyons800/forge` only.

> Note: GitHub App permissions cannot distinguish "push a branch" from "merge to
> main" — both are just "Contents: write". The real separation of duties is
> enforced by **rulesets** in Step 6, not by App permissions.

---

## Step 2 — Create the "Forge Reviewer" GitHub App

Repeat Step 1 with these differences:

- **Name:** `Forge Reviewer`
- **Repository permissions** — identical set:
  - **Contents:** Read & write  (needed to squash-merge + delete the branch)
  - **Pull requests:** Read & write  (approve / merge PRs)
  - **Metadata:** Read-only
- No webhook. Install on `Lyons800/forge` only.
- Note its **App ID** and **generate + download its own private key (.pem)**.

> Same caveat: App perms can't express "may merge but may not push branches."
> The ruleset in Step 6 is what actually stops the Reviewer from pushing
> `claude/*` and stops the Implementer from pushing `main`.

---

## Step 3 — Get an Anthropic API key

- Go to <https://console.anthropic.com> → **API Keys** → create a key.
- This is the credential that is **metered / billed** on every engine run.
  Until `ENGINE_ENABLED=true` (Step 5), it is never used.

---

## Step 4 — Set repo secrets

Run from inside the repo. For the `.pem` secrets, point at the downloaded files.

```bash
# Implementer App
gh secret set IMPLEMENTER_APP_ID --repo Lyons800/forge --body '<implementer app id>'
gh secret set IMPLEMENTER_APP_PRIVATE_KEY --repo Lyons800/forge < /path/to/forge-implementer.private-key.pem

# Reviewer App
gh secret set REVIEWER_APP_ID --repo Lyons800/forge --body '<reviewer app id>'
gh secret set REVIEWER_APP_PRIVATE_KEY --repo Lyons800/forge < /path/to/forge-reviewer.private-key.pem

# Anthropic (the metered key)
gh secret set ANTHROPIC_API_KEY --repo Lyons800/forge --body '<sk-ant-...>'

# Prod database (Neon) so the engine can read the board via listBoardSignals
gh secret set DATABASE_URL --repo Lyons800/forge --body '<prod neon connection string>'
```

Verify they exist (names only; values are never shown):

```bash
gh secret list --repo Lyons800/forge
```

> PostHog / Sentry / Vercel creds are **optional** for now — add them later as
> additional secrets and wire them into the implementer workflow's `settings.env`
> to enable the usage signal + canary watch.

---

## Step 5 — Set the master on-switch (repo VARIABLE)

This is THE switch. It is a **variable**, not a secret. Until it equals the
string `true`, both workflow jobs are skipped and nothing is billed.

```bash
gh variable set ENGINE_ENABLED --repo Lyons800/forge --body 'true'
gh variable list --repo Lyons800/forge   # confirm ENGINE_ENABLED = true
```

> Do this LAST, after Steps 1–4 and Step 6, so the first enabled run already has
> credentials and the ruleset enforcement in place.

---

## Step 6 — Configure rulesets to enforce separation of duties

This is the **real** enforcement of CONSTITUTION.md §4 (App perms can't express
it). Create two branch rulesets that restrict who may push to which branches,
and keep the existing required status checks.

The bypass list uses the **App's integration ID** (its installed-app bypass
actor), which differs from the App ID. Look them up first:

```bash
# Implementer App integration id
gh api /repos/Lyons800/forge/installations --jq \
  '.installations[] | select(.app_slug=="forge-implementer") | .app_id'
# Reviewer App integration id
gh api /repos/Lyons800/forge/installations --jq \
  '.installations[] | select(.app_slug=="forge-reviewer") | .app_id'
```

> In rulesets, an App bypass actor is `{"actor_id": <app integration id>,
> "actor_type": "Integration", "bypass_mode": "always"}`. Everyone else is
> blocked by the rule's `creation`/`update`/`deletion`/non-fast-forward
> restriction unless listed as a bypass actor.

### Ruleset A — `main` is Reviewer-only

Restrict who can push/merge to `main` to the **Reviewer App** (plus you, the
admin, via `enforce_admins=false` on the legacy protection / or as an org/owner
bypass). Keep `gate`, `migrations`, `control-plane-guard` required.

```bash
gh api -X POST /repos/Lyons800/forge/rulesets \
  -f name='main: reviewer-only writes' \
  -f target='branch' \
  -f enforcement='active' \
  -F 'conditions[ref_name][include][]=refs/heads/main' \
  -F 'bypass_actors[][actor_id]=<REVIEWER_APP_INTEGRATION_ID>' \
  -F 'bypass_actors[][actor_type]=Integration' \
  -F 'bypass_actors[][bypass_mode]=always' \
  -F 'rules[][type]=required_status_checks' \
  -F 'rules[][parameters][required_status_checks][][context]=gate' \
  -F 'rules[][parameters][required_status_checks][][context]=migrations' \
  -F 'rules[][parameters][required_status_checks][][context]=control-plane-guard' \
  -F 'rules[][parameters][strict_required_status_checks_policy]=true' \
  -F 'rules[][type]=non_fast_forward'
```

Then add a second ruleset (or extend) that **restricts updates** to `main` so
that only the Reviewer App bypass actor can push/merge — i.e. add a `rules`
entry of type `update` with no bypass for anyone but the Reviewer App. (In the
UI: New ruleset → Target `main` → "Restrict updates" → add Reviewer App to
"Bypass list".)

### Ruleset B — `claude/*` is Implementer-only

Restrict creation/updates of `claude/*` branches to the **Implementer App**, so
the Reviewer can read and merge them but cannot push to them.

```bash
gh api -X POST /repos/Lyons800/forge/rulesets \
  -f name='claude/*: implementer-only writes' \
  -f target='branch' \
  -f enforcement='active' \
  -F 'conditions[ref_name][include][]=refs/heads/claude/*' \
  -F 'bypass_actors[][actor_id]=<IMPLEMENTER_APP_INTEGRATION_ID>' \
  -F 'bypass_actors[][actor_type]=Integration' \
  -F 'bypass_actors[][bypass_mode]=always' \
  -F 'rules[][type]=creation' \
  -F 'rules[][type]=update'
```

> Easier alternative (UI): Settings → Rules → Rulesets → New branch ruleset
> for each target above, set enforcement Active, add the appropriate App to the
> Bypass list, and enable "Restrict creations / Restrict updates" so only the
> bypass actor (the App) and admins can write. Keep the existing required status
> checks ruleset/protection on `main` intact.

Net effect:
- Implementer App: may push/create `claude/*`, open PRs, read `main` — but
  cannot push or merge to `main`.
- Reviewer App: may merge to `main` and delete branches — but cannot push
  `claude/*` or open PRs.
- This matches the token-scoping table in CONSTITUTION.md §4 and survives even
  if one agent is manipulated.

---

## Step 7 — Verify (still zero cost if you skip Step 5)

```bash
gh workflow list --repo Lyons800/forge
# expect engine-implementer and engine-reviewer to appear (active, not yet run)
```

To do a controlled first run after `ENGINE_ENABLED=true`:

```bash
gh workflow run engine-implementer.yml --repo Lyons800/forge   # manual dispatch
gh run watch --repo Lyons800/forge
```

---

## Turn it OFF (kill switch)

Any of the following stops all engine spend immediately:

```bash
# Flip the master switch off (jobs skip on the next trigger):
gh variable set ENGINE_ENABLED --repo Lyons800/forge --body 'false'
# or delete it entirely:
gh variable delete ENGINE_ENABLED --repo Lyons800/forge
```

You can also disable each workflow in the Actions UI, or revoke the Anthropic
key in the console. The `BREAK_GLASS` invariant (CONSTITUTION.md §5) means you,
`@Lyons800`, always retain full manual control of merges, deploys, and rollback.
