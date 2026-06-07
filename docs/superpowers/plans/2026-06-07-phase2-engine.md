# Forge Phase 2 (The Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stand up the autonomous daily loop ("the Engine") that operates *inside* the Phase 1 cage — reading signals, deciding the top items within a weekly cap, implementing on a `claude/` branch, gating on CI, shipping via canary with auto-rollback, publishing its own changelog, and resetting context — with the AI having full control of the APP plane and zero ability to touch the CONTROL plane.

**Architecture:** A Claude Code **Routine** (cloud-scheduled, ~1 bounded run/day) running a fixed operating prompt that obeys `CONSTITUTION.md`. The Routine commits only to `claude/`-prefixed branches; a CI **control-plane guard** blocks any PR that touches control-plane paths; the existing destructive-migration guard + test suite are the merge gate; a canary→rollback loop watches Sentry. Context resets each run via `STATUS.md` (no memory accumulation → no misevolution).

**Tech:** Claude Code Routines · GitHub Actions · Vercel Rolling Releases + Rollback REST API · Sentry · Neon (PITR) · the Phase 1 codebase.

---

## ⛔ PREREQUISITE GATES (must be true before ANY autonomous run)

These are not tasks to code — they are conditions. Do not enable the Routine until all three hold.

- [ ] **G-A: Control-plane enforcement is real.** Branch protection on `main` requiring the `gate`, `migrations`, and `control-plane-guard` checks. This needs the repo **public** (free) or **GitHub Pro**. Until then the "AI can't edit its guardrails" claim is unenforced. (Oisin deferred this in Phase 1 — it must be resolved here.)
- [ ] **G-B: Production is live with a real database.** Neon project with **PITR enabled**; Vercel prod env has `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BREAK_GLASS_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`(+host), `SENTRY_DSN`. The app runs end-to-end in prod (sign-up, tool, board, build-log).
- [ ] **G-C: Scoped agent credential exists.** A GitHub token/identity for the Routine that can push to `claude/*` branches and open PRs, but is NOT a repo admin (cannot change branch protection, secrets, or merge bypassing checks). Document where it lives (off-repo).

---

## Milestone H — Control-plane guard (interim + permanent enforcement)

### Task H1: CI job that blocks control-plane edits on agent PRs

**Files:** Create `scripts/check-control-plane.sh`; Modify `.github/workflows/ci.yml`; Test `tests/unit/control-plane-guard.test.ts`

- [ ] **Step 1: Write the failing test** (TDD — the script doesn't exist yet)

```typescript
// tests/unit/control-plane-guard.test.ts
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
const run = (files: string[]) => {
  try { execFileSync("bash", ["scripts/check-control-plane.sh", "--files", files.join("\n")]); return 0; }
  catch (e: any) { return e.status ?? 1; }
};
describe("control-plane guard", () => {
  it("blocks a PR that modifies a control-plane path", () => {
    expect(run(["control/auth/auth.config.ts"])).not.toBe(0);
    expect(run(["CONSTITUTION.md"])).not.toBe(0);
    expect(run([".github/workflows/ci.yml"])).not.toBe(0);
    expect(run(["src/lib/auth.ts"])).not.toBe(0);
  });
  it("allows a PR that only touches the app plane", () => {
    expect(run(["src/app/tools/changelog/page.tsx", "src/lib/changelog/generate.ts"])).toBe(0);
  });
});
```

- [ ] **Step 2: Run it, watch it fail** — `pnpm vitest run tests/unit/control-plane-guard.test.ts` → FAIL (script missing).

- [ ] **Step 3: Implement the guard** — `scripts/check-control-plane.sh` reads a newline-separated file list (via `--files` arg for tests, or `git diff --name-only <base>..HEAD` in CI). It exits non-zero if ANY path matches the control-plane set:
`^CONSTITUTION\.md$`, `^control/`, `^atlas\.hcl$`, `^scripts/check-migrations\.sh$`, `^scripts/check-control-plane\.sh$`, `^\.github/`, `^tests/`, `^src/lib/auth\.ts$`. (Note: the guard protects itself and the test dir — the agent cannot weaken its own gate.) Echo each blocked path.

- [ ] **Step 4: Run it, watch it pass** — `pnpm vitest run tests/unit/control-plane-guard.test.ts` → PASS.

- [ ] **Step 5: Add the `control-plane-guard` CI job** that runs ONLY on PRs from `claude/*` head branches: `git diff --name-only origin/${{github.base_ref}}...HEAD | bash scripts/check-control-plane.sh --stdin`. (Human PRs are exempt — humans are allowed to change the control plane via CODEOWNERS review.)

- [ ] **Step 6: Commit** — `git commit -m "feat: control-plane guard (blocks agent edits to its own guardrails)"`

### Task H2: Make `control-plane-guard` a required check

- [ ] **Step 1:** Once G-A holds, add `control-plane-guard` to the required status checks on `main` (alongside `gate`, `migrations`). Document the exact `gh api` call. Verify a synthetic `claude/test` PR that edits `CONSTITUTION.md` is BLOCKED from merge.

---

## Milestone I — Engine I/O surfaces (what the agent reads & writes)

### Task I1: "Approved board items" read API (engine fuel)

**Files:** Create `src/app/api/engine/inbox/route.ts`, `src/lib/board/repo.ts` (extend); Test `tests/unit/engine-inbox.test.ts`

- [ ] Engine must read ONLY `approved` board rows (never `pending` raw, never `needs_review`). Add `listApprovedSubmissions(db)` to the board repo and a GET endpoint (auth: a shared engine secret header, or read at build-time from DB directly in the Routine). TDD: a `needs_review` row must NEVER appear in the result. Commit.

### Task I2: Daily report + changelog writer

**Files:** Create `scripts/engine/write-report.ts`; reuse `src/lib/changelog`

- [ ] A helper the Routine calls to (a) persist the day's research/triage report (a `engine_reports` APP-plane table — additive migration), and (b) append the shipped changelog entry via the existing changelog path so it appears on the public Build-Log. TDD the report persistence against PGlite. Commit.

### Task I3: Weekly ship-cap accounting

**Files:** Create `src/lib/engine/cap.ts`; Test `tests/unit/cap.test.ts`

- [ ] Pure function `canShipThisWeek(shipsThisWeek: number, cap = 3): boolean` + a small `engine_ships` table (or read from changelog timestamps) to count ships in the rolling 7 days. TDD. The cap is read from `CONSTITUTION.md`'s stated value (default 3). Commit.

---

## Milestone J — Canary → auto-rollback loop (close the loop Vercel won't)

### Task J1: Vercel rollback client

**Files:** Create `src/lib/engine/vercel-rollout.ts`; Test `tests/unit/vercel-rollout.test.ts`

- [ ] Thin client wrapping the Vercel REST API: `getActiveRollout()`, `advance()`, `rollback(deploymentId)` (POST `/v1/projects/{id}/rollback/{deploymentId}`). Inject `fetch` for testability; TDD with a mocked fetch asserting the correct endpoints/headers are called. Reads `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` from env. Commit.

### Task J2: Sentry error-rate reader + decision wiring

**Files:** Create `src/lib/engine/sentry-signal.ts`; reuse `src/lib/canary.ts` (`shouldRollback`)

- [ ] Fetch baseline vs canary error-rate from Sentry (events API), feed into the existing `shouldRollback`. TDD with mocked responses (sustained regression → true; small samples → false). Commit.

### Task J3: The watch script

**Files:** Create `scripts/engine/canary-watch.ts`

- [ ] Orchestrates J1+J2: during a rolling release, poll Sentry; if `shouldRollback` → `rollback()` and write an incident note to the report; else advance to 100%. Document the poll interval and timeout. (Run by the Routine post-merge.) Integration-test the decision path with mocks. Commit.

---

## Milestone K — The Routine (the actual autonomy)

### Task K1: The operating prompt

**Files:** Create `control/engine/OPERATING_PROMPT.md` (CONTROL plane — agent cannot edit it)

- [ ] Write the fixed prompt the Routine runs each day. It MUST: load `CONSTITUTION.md` + `STATUS.md`; read approved board items + Sentry + PostHog; write the daily report; pick the top item(s) within the weekly cap; implement on a `claude/<date>-<slug>` branch with tests; open a PR; ensure `gate`+`migrations`+`control-plane-guard` are green; merge; run `canary-watch`; write the changelog; rewrite `STATUS.md` for the next run (curated, bounded — NOT an ever-growing log). It must NEVER attempt to edit control-plane paths and must stop if it finds itself wanting to.

### Task K2: Create + schedule the Routine

- [ ] Using Claude Code Routines (`/schedule` or the Routines UI), create a routine: repo = Lyons800/forge, prompt = `control/engine/OPERATING_PROMPT.md` contents, model = (current best coding model), schedule = once daily, branch = `claude/` (default restriction ON — do NOT enable unrestricted pushes). Note the metered-credit cost (post-2026-06-15) and set a sane daily cap.

### Task K3: Observed warm-up (do NOT skip to full-auto)

- [ ] Run the Routine in an **observed warm-up**: for the first N runs (e.g. 5), a human watches each PR before it merges (temporarily require manual approval on the `claude/*`→`main` merge). Confirm: it only touches the app plane, tests gate correctly, canary/rollback behaves, changelog publishes, STATUS.md resets cleanly. Only after N clean runs, flip to full-auto (remove the manual approval). Record the flip in `STATUS.md`.

---

## Milestone L — Kill switch & observability

### Task L1: Engine kill switch

**Files:** Create a documented off-repo switch

- [ ] A single env flag / Routine pause the owner controls (outside the agent's reach) that halts all autonomous runs immediately. Document how to trigger it and verify it stops a scheduled run.

### Task L2: Engine health dashboard (minimal)

- [ ] A `/engine` page (public or owner-only) summarising: last run, items shipped this week vs cap, last rollback, current STATUS.md. Reads existing tables. Keeps the spectacle visible and gives the owner a glance-able control surface.

---

## Definition of done (Phase 2)
- [ ] Prereq gates G-A/G-B/G-C all satisfied.
- [ ] `control-plane-guard` required + proven to block agent edits to guardrails.
- [ ] Engine reads only `approved` board items; writes daily report + public changelog.
- [ ] Weekly cap enforced; canary→auto-rollback proven on a real bad deploy (in warm-up).
- [ ] Routine scheduled; observed warm-up passed N clean runs; flipped to full-auto.
- [ ] Kill switch verified; `/engine` dashboard live.

**Then:** the claim is real — *"the first self-evolving software where the AI has full control of the stack, contained only by guardrails."* Begin the public Build-Log reveal (GTM), and start planning the re-point at a real-buyer vertical.
