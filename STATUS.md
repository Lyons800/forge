# Forge STATUS

Live: https://forge-lilac-beta.vercel.app
Repo: https://github.com/Lyons800/forge (public)
**Phase 1 + Phase 2 COMPLETE. 108 tests green, CI green.**
Engine code exists but is NOT activated (default-OFF, unscheduled). Activation needs the hard gates below.

## PRODUCTION IS LIVE (2026-06-08)
- Neon DB (project `crimson-tooth-24733307`, pooled). All tables migrated.
- Vercel env set (encrypted): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BREAK_GLASS_TOKEN`.
- Optional (env-gated, not set): `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`. App works without them.
- Vercel git auto-deploy connected → main deploys automatically.

## Hard gates before autonomous runs
1. ✅ Control-plane enforcement (branch protection: `gate`+`migrations`+`control-plane-guard` required).
2. ✅ Production live and verified.
3. ⛔ **Scoped agent token (REMAINING)** — GitHub identity/token that can push `claude/*` + open PRs but is NOT admin.
4. 🔄 **Observed warm-up IN PROGRESS** — ~3 more supervised runs before activating.

## Last run — 2026-06-08 (warm-up run #2)
- **Selected:** Style Build-Log page to match homepage design system.
- **Shipped:** PR #3 — `claude/2026-06-08-styled-build-log`
  - `src/lib/changelog/render.ts` — new testable `groupEntriesByDate` + `formatShipDate` utilities.
  - `src/app/changelog/page.tsx` — replaced bare-HTML/dangerouslySetInnerHTML with styled dark-theme React layout.
  - `src/app/changelog/page.module.css` — 230 lines matching homepage design tokens.
  - `tests/unit/changelog-render.test.ts` — 7 new unit tests (108 total).
- **CI:** gate ✅ / migrations ✅ / control-plane-guard ✅ (all green after E2E heading fix).
- **Note:** First commit changed h1 text; existing E2E test caught it → fixed in second commit. Constitution held.
- **Changelog entry NOT published** (supervised run — human merges first).

## Cap usage
- **1/3 ships this week** (rolling 7-day window from 2026-06-01). 2 slots remaining.

## Rolling roadmap (next 2-3 runs)
1. **RSS/Atom feed for Build-Log** — subscribers can follow autonomous ships; compounds directly on the styled page just landed. Low effort, high strategic fit (build-in-public story).
2. **Owner approve endpoint** — `POST /api/admin/board/:id/approve` (break-glass auth) so board items can become `approved` without direct DB access. Unblocks full autonomy.
3. **Styled /board page** — same design-system gap as Build-Log had; lower priority (fewer visitors) but consistent UX is valuable.

## Findings / debts
- `atlas migrate lint` went Pro-only → custom grep guard (works; upgrade before high-freq autonomy).
- `/engine` page is public (no auth) — acceptable for now; owner-only data is minimal.
- `board_submissions.status` has no DB CHECK constraint (additive-only fix possible).
- E2E test suite is a real gate — caught the h1 text regression immediately. Value confirmed.

## Next run guidance
Verify PR #3 merged + auto-deployed. Then pick from roadmap above (RSS feed is highest-scored next item).
Check: has `approved` board item count increased? If so, weigh against own ideas per rubric.
