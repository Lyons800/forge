import { db } from "@/lib/db";
import { listReports, countShipsLast7Days, type AnyDb } from "@/lib/engine/report-repo";
import { isEngineEnabled } from "@/lib/engine/kill-switch";
import { canShipThisWeek } from "@/lib/engine/cap";

export const dynamic = "force-dynamic";

const SHIP_CAP = 3;

export default async function EngineDashboardPage() {
  const engineOn = isEngineEnabled();

  // Guard: db is null when DATABASE_URL is not configured
  if (!db) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 720 }}>
        <h1>Engine</h1>
        <p style={{ color: "#888" }}>
          Database not configured — set <code>DATABASE_URL</code> to enable the
          engine dashboard.
        </p>
      </main>
    );
  }

  const typedDb = db as unknown as AnyDb;
  const [shipsThisWeek, reports] = await Promise.all([
    countShipsLast7Days(typedDb),
    listReports(typedDb, 5),
  ]);

  const okToShip = canShipThisWeek(shipsThisWeek, SHIP_CAP);
  const latestReport = reports[0] ?? null;

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 720 }}>
      <h1>Engine</h1>
      <p style={{ color: "#666" }}>
        Autonomous engine status — owner view.{" "}
        <a href="/changelog">Public Build-Log &rarr;</a>
      </p>

      <hr />

      {/* Kill switch status */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Kill Switch</h2>
        <p
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            borderRadius: 4,
            background: engineOn ? "#d4f0d4" : "#f0d4d4",
            color: engineOn ? "#1a5c1a" : "#5c1a1a",
            fontWeight: "bold",
          }}
        >
          {engineOn ? "ENGINE ENABLED" : "ENGINE DISABLED (default-off)"}
        </p>
        {!engineOn && (
          <p style={{ color: "#888", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Set <code>ENGINE_ENABLED=true</code> in the environment to enable autonomous runs.
          </p>
        )}
      </section>

      {/* Weekly ship cap */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Weekly Ship Cap</h2>
        <p data-testid="cap-indicator">
          <strong>
            {shipsThisWeek}/{SHIP_CAP} ships this week
          </strong>{" "}
          &mdash;{" "}
          {okToShip ? (
            <span style={{ color: "#1a5c1a" }}>
              {SHIP_CAP - shipsThisWeek} slot{SHIP_CAP - shipsThisWeek !== 1 ? "s" : ""}{" "}
              remaining
            </span>
          ) : (
            <span style={{ color: "#5c1a1a" }}>Cap reached — no ships until next week</span>
          )}
        </p>
        <p style={{ color: "#888", fontSize: "0.75rem" }}>
          Rolling 7-day window (last 7 days)
        </p>
      </section>

      {/* Last run */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Last Run</h2>
        {latestReport ? (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 4,
              padding: "0.75rem",
            }}
          >
            <p style={{ margin: 0, color: "#888", fontSize: "0.75rem" }}>
              {new Date(latestReport.runDate).toUTCString()}
            </p>
            <p style={{ margin: "0.5rem 0 0", fontWeight: "bold" }}>{latestReport.summary}</p>
          </div>
        ) : (
          <p style={{ color: "#888" }}>No runs yet.</p>
        )}
      </section>

      {/* Recent reports */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>
          Recent Reports (last 5)
        </h2>
        {reports.length === 0 ? (
          <p style={{ color: "#888" }}>No reports yet.</p>
        ) : (
          <ol style={{ paddingLeft: "1.25rem" }}>
            {reports.map((r) => (
              <li key={r.id} style={{ marginBottom: "0.5rem" }}>
                <span style={{ color: "#888", fontSize: "0.75rem" }}>
                  {new Date(r.runDate).toUTCString()}
                </span>
                <br />
                {r.summary}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
