"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { statusLabel, statusTone } from "@/lib/board/format";
import styles from "./page.module.css";

type Submission = { id: number; title: string; body: string; status: string; createdAt: string };

export default function BoardPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const refreshSubmissions = useCallback(async () => {
    const res = await fetch("/api/board");
    if (res.ok) {
      const data: Submission[] = await res.json();
      setSubmissions(data);
    }
  }, []);

  useEffect(() => {
    fetch("/api/board")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Submission[]) => setSubmissions(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setErrorMsg("Title and body are required.");
      setSubmitStatus("error");
      return;
    }
    setSubmitStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      await res.json();
      setTitle("");
      setBody("");
      setSubmitStatus("done");
      await refreshSubmissions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submit failed";
      setErrorMsg(msg);
      setSubmitStatus("error");
    }
  };

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.navBrand}>Forge</Link>
        <ul className={styles.navLinks}>
          <li><Link href="/tools/changelog">Tools</Link></li>
          <li><Link href="/changelog">Build Log</Link></li>
          <li><Link href="/board" className={styles.navActive}>Board</Link></li>
          <li><Link href="/engine">Engine</Link></li>
          <li><Link href="/sign-in">Sign in</Link></li>
        </ul>
      </nav>

      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <p className={styles.eyebrow}>Improvement Board</p>
          <h1 className={styles.heading}>Shape what Forge builds next.</h1>
          <p className={styles.sub}>
            Submit an idea or improvement request. The autonomous engine reads
            the board as a signal source when deciding what to ship.{" "}
            <em className={styles.moderationNote}>
              All submissions are moderated before appearing below.
            </em>
          </p>
        </header>

        {/* Submit form */}
        <section className={styles.formSection} aria-label="Submit an idea">
          <h2 className={styles.formHeading}>Submit an idea</h2>

          <div className={styles.form}>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="board-title"
              className={styles.input}
              aria-label="Idea title"
            />
            <textarea
              placeholder="Describe your idea or improvement request…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              data-testid="board-body"
              rows={4}
              className={styles.textarea}
              aria-label="Idea description"
            />
            <div className={styles.formFooter}>
              <button
                onClick={handleSubmit}
                disabled={submitStatus === "submitting"}
                data-testid="board-submit"
                className={styles.submitButton}
              >
                {submitStatus === "submitting" ? "Submitting…" : "Submit idea"}
              </button>

              {submitStatus === "done" && (
                <p className={styles.feedbackOk} data-testid="submit-success" role="status">
                  Submitted — your idea is pending moderation.
                </p>
              )}
              {submitStatus === "error" && (
                <p className={styles.feedbackError} data-testid="submit-error" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* List */}
        <section className={styles.listSection} aria-label="Submitted ideas">
          <div className={styles.listHeader}>
            <h2 className={styles.listHeading}>Ideas</h2>
            {submissions.length > 0 && (
              <span className={styles.count}>
                {submissions.length} {submissions.length === 1 ? "idea" : "ideas"}
              </span>
            )}
          </div>

          {submissions.length === 0 ? (
            <div className={styles.empty} data-testid="board-empty">
              <span className={styles.emptyIcon} aria-hidden="true">⬡</span>
              No ideas yet — be the first to suggest one.
            </div>
          ) : (
            <ul className={styles.list} data-testid="board-list">
              {submissions.map((s) => {
                const tone = statusTone(s.status);
                return (
                  <li key={s.id} data-testid={`board-item-${s.id}`} className={styles.item}>
                    <div className={styles.itemHead}>
                      <h3 className={styles.itemTitle}>{s.title}</h3>
                      <span
                        className={`${styles.statusPill} ${
                          tone === "accent" ? styles.statusAccent : styles.statusNeutral
                        }`}
                      >
                        {statusLabel(s.status)}
                      </span>
                    </div>
                    <p className={styles.itemBody}>{s.body}</p>
                  </li>
                );
              })}
            </ul>
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
          <Link href="/changelog">Build Log</Link>
          <span className={styles.footerSep} aria-hidden="true" />
          Built autonomously by Forge.
        </p>
      </footer>
    </div>
  );
}
