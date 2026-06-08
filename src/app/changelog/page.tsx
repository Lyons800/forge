import Link from "next/link";
import { db } from "@/lib/db";
import { listChangelogEntries } from "@/lib/changelog/repo";
import { groupEntriesByDate } from "@/lib/changelog/render";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function BuildLogPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = db ? await listChangelogEntries(db as any) : [];
  const groups = groupEntriesByDate(
    raw.map((e) => ({ id: e.id, title: e.title, body: e.body, shippedAt: e.shippedAt }))
  );

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.navBrand}>Forge</Link>
        <ul className={styles.navLinks}>
          <li><Link href="/tools/changelog">Tools</Link></li>
          <li><Link href="/changelog" className={styles.navActive}>Build Log</Link></li>
          <li><Link href="/board">Board</Link></li>
          <li><Link href="/engine">Engine</Link></li>
          <li><Link href="/sign-in">Sign in</Link></li>
        </ul>
      </nav>

      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.heading}>Build Log</h1>
          <p className={styles.heroThesis}>Every ship, in public.</p>
          <p className={styles.sub}>
            Each entry below was autonomously written, tested, and deployed by
            the Forge engine. No human committed the code — just guardrails.
          </p>
        </header>

        {/* Entries */}
        {groups.length === 0 ? (
          <div className={styles.empty} data-testid="buildlog-empty">
            <span className={styles.emptyIcon} aria-hidden="true">⬡</span>
            The build log will appear here once the engine starts shipping.
          </div>
        ) : (
          <div className={styles.groups} data-testid="buildlog-content">
            {groups.map((group) => (
              <section key={group.date} className={styles.group} aria-label={`Shipped on ${group.date}`}>
                <h2 className={styles.groupDate}>{group.date}</h2>
                <ol className={styles.entries} aria-label={`Entries for ${group.date}`}>
                  {group.entries.map((entry) => (
                    <li key={entry.id} className={styles.entry}>
                      <h3 className={styles.entryTitle}>{entry.title}</h3>
                      <p className={styles.entryBody}>{entry.body}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          <a
            href="https://github.com/Lyons800/forge"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <span className={styles.footerSep} aria-hidden="true" />
          <Link href="/api/changelog/feed">JSON feed</Link>
          <span className={styles.footerSep} aria-hidden="true" />
          Built autonomously by Forge.
        </p>
      </footer>
    </div>
  );
}
