import Link from "next/link";
import { db } from "@/lib/db";
import { listChangelogEntries } from "@/lib/changelog/repo";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

async function getLatestEntries() {
  if (!db) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await listChangelogEntries(db as any);
    return entries.slice(0, 3);
  } catch {
    return null;
  }
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export default async function HomePage() {
  const entries = await getLatestEntries();

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav} aria-label="Main navigation">
        <span className={styles.navBrand}>Forge</span>
        <ul className={styles.navLinks}>
          <li><Link href="/tools/changelog">Tools</Link></li>
          <li><Link href="/changelog">Build Log</Link></li>
          <li><Link href="/board">Board</Link></li>
          <li><Link href="/engine">Engine</Link></li>
          <li>
            <Link href="/sign-in" className={styles.navSignIn}>Sign in</Link>
          </li>
        </ul>
      </nav>

      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroBadge} aria-hidden="true">
            <span className={styles.heroBadgeDot} />
            <span>Self-evolving software</span>
          </div>
          <h1 id="hero-heading" className={styles.heroHeading}>
            Forge
          </h1>
          <p className={styles.heroThesis}>
            Software that builds itself.
          </p>
          <p className={styles.heroSub}>
            An autonomous engine has full control of the entire stack — code,
            schema, auth, deploys. It runs daily, picks the top items from the
            improvement board, ships them, and publishes every change to the
            public build log. No human approval gate. Just guardrails.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/changelog" className={styles.ctaPrimary}>
              Watch it build
            </Link>
            <Link href="/board" className={styles.ctaSecondary}>
              Suggest a feature
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className={styles.howSection} aria-labelledby="how-heading">
          <h2 id="how-heading" className={styles.sectionLabel}>How it works</h2>
          <ol className={styles.steps} aria-label="Build loop steps">
            <li className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">01</span>
              <div>
                <strong>Users suggest</strong>
                <p>Founders and indie hackers drop ideas on the improvement board.</p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">02</span>
              <div>
                <strong>The engine researches</strong>
                <p>Each day, the engine reads the board, scores ideas, and picks the highest-value item to ship.</p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">03</span>
              <div>
                <strong>It codes, tests, and deploys</strong>
                <p>The engine writes the code, runs the test suite, and ships autonomously — guarded by an immutable control plane it cannot modify.</p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">04</span>
              <div>
                <strong>Everything is public</strong>
                <p>Every ship appears in the build log the moment it lands — open and auditable.</p>
              </div>
            </li>
          </ol>
        </section>

        {/* Live build log teaser */}
        <section className={styles.logSection} aria-labelledby="log-heading">
          <div className={styles.logHeader}>
            <h2 id="log-heading" className={styles.sectionLabel}>Latest builds</h2>
            <Link href="/changelog" className={styles.logLink}>
              Full build log &rarr;
            </Link>
          </div>

          {entries === null || entries.length === 0 ? (
            <div className={styles.logPlaceholder}>
              <span className={styles.logPlaceholderIcon} aria-hidden="true">⬡</span>
              <p>The build log will appear here once the engine starts shipping.</p>
            </div>
          ) : (
            <ol className={styles.logList} aria-label="Recent changelog entries">
              {entries.map((entry) => (
                <li key={entry.id} className={styles.logEntry}>
                  <time
                    className={styles.logDate}
                    dateTime={formatDate(entry.shippedAt)}
                  >
                    {formatDate(entry.shippedAt)}
                  </time>
                  <span className={styles.logTitle}>{entry.title}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
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
          Currently in early build.
        </p>
      </footer>
    </div>
  );
}
