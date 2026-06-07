# Control Plane

This directory is the **immutable control plane** for the Forge platform.

## What lives here

| Path | Purpose |
|------|---------|
| `control/auth/auth.config.ts` | Better Auth core configuration — providers, secret, DB adapter |

## Rules

1. **Never agent-editable.** The autonomous engine (the self-evolving toolkit) must not modify any file inside `control/`. Changes here require explicit human review and commit.
2. **Auth tables are protected.** The auth tables (`user`, `session`, `account`, `verification`) are created by migrations generated from the schema definitions referenced here. The destructive-migration guard (`scripts/check-migrations.sh`) hard-blocks any DROP/RENAME against these tables.
3. **Secrets via env only.** `BETTER_AUTH_SECRET` and `BREAK_GLASS_TOKEN` are loaded from environment variables. They must never appear in source code or be committed to the repository.
4. **Off-repo break-glass.** The break-glass super-admin token (`BREAK_GLASS_TOKEN`) lives only in production environment secrets, ensuring that even a fully autonomous agent cannot lock the owner out.

## Why a control plane?

The engine can read, analyse, and extend the app plane (`src/`, `drizzle/schema.ts`, etc.). A separate control plane ensures the authentication core and security invariants remain under human control at all times, even when the engine has broad write access to the rest of the codebase.
