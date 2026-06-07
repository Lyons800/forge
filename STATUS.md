# Forge STATUS

Live: https://forge-lilac-beta.vercel.app
Repo: https://github.com/Lyons800/forge (private)
Phase 1 (Substrate) COMPLETE and merged to `main` (35 tests green). Phase 2 (Engine) plan written; not yet built.

## Before the Engine can run autonomously (hard gates)
1. Resolve control-plane enforcement: make repo PUBLIC or GitHub Pro (private+Free can't set branch protection — the mechanism that stops the agent editing its own guardrails).
2. Provide prod credentials (see bottom) and go live with a real Neon DB.
3. Upgrade the migration guard (custom script is v1; consider Atlas Pro / real schema-diff) per review.

## Done
- **Milestone A** — Next.js scaffold, /api/health, Vitest, Playwright, CI `gate` (lint+unit+e2e), Vercel prod deploy.
- **Milestone B1** — Drizzle schema (`changelog_entries`), Neon prod client, PGlite test harness + integration test.
- **Milestone B2** — Destructive-migration CI gate via `scripts/check-migrations.sh` (proven: DROP/RENAME fails CI). NOTE: `atlas migrate lint` went Pro-only v0.38+, so a custom grep-based guard is used instead.
- **Pure logic (TDD)** — changelog generator, board sanitiser (anti prompt-injection), canary rollback decision.
- 12 unit/integration tests green; CI green.

## Decisions
- Branch protection DEFERRED (GitHub Free + private repo can't set it). Control plane enforced later via scoped agent token + CODEOWNERS. Revisit before Engine (Phase 2) goes live.

## Remaining (Phase 1)
- **C** Better Auth (core in control plane) + break-glass — needs `BETTER_AUTH_SECRET` (generatable), tests on PGlite.
- **D2** Changelog tool UI + persistence.
- **E1** Public Build-Log page.
- **E2** Improvement Board table + API + page (sanitiser already built).
- **F1/F2** Sentry + PostHog wiring (env-gated).
- **G1** CONSTITUTION.md + CODEOWNERS.
- **B3** per-PR Neon branch in CI — needs `NEON_API_KEY` + `NEON_PROJECT_ID`.

## Credentials needed for PRODUCTION (not for local build)
- Neon: `DATABASE_URL` (+ `NEON_API_KEY`, `NEON_PROJECT_ID` for CI branching)
- `BETTER_AUTH_SECRET`, `BREAK_GLASS_TOKEN` (can be generated)
- Sentry `SENTRY_DSN`
- PostHog `NEXT_PUBLIC_POSTHOG_KEY` (+ host, eu)
