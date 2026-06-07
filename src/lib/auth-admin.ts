/**
 * Break-glass super-admin gate.
 *
 * The BREAK_GLASS_TOKEN lives ONLY in environment secrets (never in source).
 * An autonomous agent that can write source code cannot read prod secrets,
 * so it can never manufacture a valid token — guaranteeing the owner retains
 * a recovery path even if the agent mis-configures normal auth.
 */
export function isBreakGlass(token: string | undefined): boolean {
  const secret = process.env.BREAK_GLASS_TOKEN;
  return Boolean(secret) && token === secret;
}
