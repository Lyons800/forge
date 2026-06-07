/**
 * L1 — Engine kill switch.
 *
 * The Engine is DEFAULT OFF. It only runs when the owner explicitly sets
 * ENGINE_ENABLED=true in the environment. Any other value (including "TRUE",
 * "1", unset, or "false") keeps the engine halted.
 *
 * This env var must be controlled OUTSIDE the agent's reach (e.g. Vercel
 * dashboard / GitHub Actions secret). The agent must never write or modify it.
 */
export function isEngineEnabled(): boolean {
  return process.env.ENGINE_ENABLED === "true";
}
