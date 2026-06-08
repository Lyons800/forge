# Forge STATUS

Live: https://forge-lilac-beta.vercel.app
Repo: https://github.com/Lyons800/forge (private)
**Phase 1 (Substrate) + Phase 2 (Engine codebase) both COMPLETE and merged to `main`. 87 tests green, CI green.**
The Engine code exists but is NOT activated (it's default-OFF and unscheduled). Activation needs the hard gates below.

## PRODUCTION IS LIVE (2026-06-08)
- Neon project **forge** created (Free, AWS US East 1, project `crimson-tooth-24733307`, db `neondb`, pooled connection).
- Migrations applied to prod DB (all tables: changelog_entries, auth tables, board_submissions, engine_reports).
- Vercel production env set (encrypted): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BREAK_GLASS_TOKEN`. Redeployed.
- Verified live: /engine shows real dashboard (ENGINE DISABLED + cap), DB-backed pages work, auth ready.
- ⚠️ `BREAK_GLASS_TOKEN` + `BETTER_AUTH_SECRET` exist ONLY in Vercel (encrypted). To save the break-glass token to a password manager: `vercel env pull .env.prod.local` then copy it, then delete that file.
- NOT yet set (optional, env-gated): `NEXT_PUBLIC_POSTHOG_KEY`(+host), `SENTRY_DSN`. App works without them.
- Vercel git auto-deploy is connected → pushes to `main` deploy automatically.

## Hard gates before the Engine can run autonomously
1. ✅ **Control-plane enforcement DONE (2026-06-08)** — repo is PUBLIC; branch protection on `main` requires `gate` + `migrations` + `control-plane-guard` (strict, no force-push). The control plane is now genuinely immutable: a `claude/*` PR touching control-plane paths fails `control-plane-guard` and cannot merge. (`control-plane-guard` always runs but only enforces on `claude/*` PRs, so it's a valid required check. `enforce_admins=false` so the human owner keeps maintenance access; the agent is gated by being a non-admin token.)
2. ✅ **Production live DONE** — Neon DB + migrations + Vercel prod env + deploy verified.
3. ⛔ **Scoped agent token (REMAINING)** — a GitHub identity/token that can push `claude/*` + open/merge PRs but is NOT admin (can't bypass checks / change protection / read prod secrets).
4. 🔄 **Observed warm-up IN PROGRESS** — run #1 DONE (2026-06-08): engine took an approved board item → shipped `GET /api/changelog/feed` on a `claude/` branch → all 3 required checks passed → human-approved → merged (PR #2) → auto-deployed → live. Guardrails held; control-plane-guard correctly allowed the new test. Do ~4 more supervised runs, then create the scoped token + schedule the daily Routine + set `ENGINE_ENABLED=true` for full-auto. Kill switch = unset `ENGINE_ENABLED`.

## Findings to address before unattended runs
- **No `approved` mechanism**: board items can only become `pending`/`needs_review` via the public API; nothing marks them `approved` (the engine's only fuel). Need an owner approve action (admin UI or endpoint) before the engine can run unsupervised.
- **Guard fix shipped (2026-06-08)**: engine may ADD tests but not modify/delete existing ones (`scripts/check-control-plane.sh --name-status`).
- Verify the engine's **publish step** (writing its changelog entry to the Build-Log) in a future supervised run.
- Migration guard still grep-based (upgrade to real schema-diff before high-frequency autonomy).

## Done — Phase 1 (Substrate)
- A: Next.js + Vercel deploy + CI gate. B1: Drizzle/Neon(node-postgres)/PGlite harness. B2: destructive-migration guard `scripts/check-migrations.sh` (blocks DROP/RENAME/TRUNCATE; tested). C: Better Auth (core in `control/`, break-glass off-repo). D2: changelog tool. E1: public Build-Log. E2: moderated board (`needs_review` quarantined at SQL layer). F1/F2: Sentry+PostHog (env-gated). G1: CONSTITUTION.md + CODEOWNERS.

## Done — Phase 2 (Engine codebase, not activated)
- H1: `control-plane-guard` CI job + `scripts/check-control-plane.sh` (blocks agent edits to guardrails; normalises `./`/whitespace; covers `drizzle/schema.ts`).
- I1: approved-only inbox (`listApprovedSubmissions`). I2: `engine_reports` table + `publishShip` (atomic txn). I3: weekly ship-cap (rolling 7-day, cap 3).
- J1/J2/J3: Vercel rollout client + Sentry signal + `canary-watch` orchestrator (auto-rollback on regression; has CLI entry).
- K1: `control/engine/OPERATING_PROMPT.md` (the daily routine prompt). L1: default-OFF kill switch (`ENGINE_ENABLED`). L2: `/engine` dashboard.

## Known deviations / debts
- `atlas migrate lint` went Pro-only v0.38 → replaced with custom grep guard (proven; upgrade to a real schema-diff before high-frequency autonomy).
- Branch protection deferred (gate #1 above).
- Deferred review items (non-blocking): post-promote Sentry watch (I6), `/engine` is public (no auth), `board_submissions.status` has no DB CHECK constraint, `db.ts` null-cast pattern.

## Plans
- `docs/superpowers/specs/2026-06-07-self-evolving-toolkit-design.md`
- `docs/superpowers/plans/2026-06-07-phase1-substrate.md`
- `docs/superpowers/plans/2026-06-07-phase2-engine.md` (Milestones H–L built; H2/K2/K3 = activation, pending gates)
