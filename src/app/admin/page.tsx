import { headers } from "next/headers";
import { isBreakGlass } from "@/lib/auth-admin";

/**
 * Break-glass recovery panel.
 *
 * Access via:
 *   ?token=<BREAK_GLASS_TOKEN>                (query string)
 *   X-Break-Glass-Token: <token>              (header)
 *
 * The token lives ONLY in env secrets. It is never stored in source code,
 * database, or cookies — so an autonomous agent cannot forge it.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const queryToken = params.token;

  const reqHeaders = await headers();
  const headerToken = reqHeaders.get("x-break-glass-token") ?? undefined;

  const token = queryToken ?? headerToken;

  if (!isBreakGlass(token)) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Access Denied</h1>
        <p data-testid="denied-message">
          Break-glass token missing or invalid.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Break-Glass Recovery Panel</h1>
      <p data-testid="admin-panel">
        You are authenticated as the break-glass super-admin. Use this panel to
        recover the system if normal auth is broken.
      </p>
      <ul>
        <li>Inspect and reset user accounts via the database directly.</li>
        <li>Rotate <code>BETTER_AUTH_SECRET</code> in your hosting environment.</li>
        <li>Rotate <code>BREAK_GLASS_TOKEN</code> after use.</li>
      </ul>
    </main>
  );
}
