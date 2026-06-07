# Forge STATUS

Live: https://forge-lilac-beta.vercel.app
Repo: https://github.com/Lyons800/forge (private)
**Phase 1 (Substrate) + Phase 2 (Engine codebase) both COMPLETE and merged to `main`. 87 tests green, CI green.**
The Engine code exists but is NOT activated (it's default-OFF and unscheduled). Activation needs the hard gates below.

## ⛔ Hard gates before the Engine can run autonomously
1. **Control-plane enforcement** — make repo PUBLIC (free, on-brand) or GitHub Pro, then turn on branch protection requiring `gate` + `migrations` + `control-plane-guard`. Until then the "AI can't edit its own guardrails" guarantee is advisory only (the guard runs in CI but nothing forces it without protection).
2. **Production credentials + go live** — Neon (PITR on) `DATABASE_URL`; `BETTER_AUTH_SECRET`, `BREAK_GLASS_TOKEN`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`(+host) in Vercel. Confirm sign-up/tool/board/build-log work in prod.
3. **Scoped agent token** — a GitHub identity that can push `claude/*` + open PRs but is NOT admin (can't bypass checks / change protection / read prod secrets).
4. **Then** create the daily Routine (`control/engine/OPERATING_PROMPT.md`), set `ENGINE_ENABLED=true`, and run the OBSERVED WARM-UP (watch first ~5 runs before flipping to full-auto). Kill switch = unset `ENGINE_ENABLED`.

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
