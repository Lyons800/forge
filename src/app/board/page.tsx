"use client";

import { useState, useEffect, useCallback } from "react";

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
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 700 }}>
      <h1>Improvement Board</h1>
      <p style={{ color: "#666" }}>
        Submit ideas or improvement requests for Forge.{" "}
        <em>All submissions are moderated before appearing below.</em>
      </p>

      {submitStatus === "done" && (
        <p style={{ color: "green" }} data-testid="submit-success">
          Submitted! Your idea is pending moderation.
        </p>
      )}
      {submitStatus === "error" && (
        <p style={{ color: "red" }} data-testid="submit-error">
          {errorMsg}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="board-title"
          style={{ padding: "0.4rem" }}
        />
        <textarea
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          data-testid="board-body"
          rows={4}
          style={{ padding: "0.4rem" }}
        />
        <button
          onClick={handleSubmit}
          disabled={submitStatus === "submitting"}
          data-testid="board-submit"
          style={{ padding: "0.5rem 1rem", alignSelf: "flex-start" }}
        >
          {submitStatus === "submitting" ? "Submitting…" : "Submit"}
        </button>
      </div>

      <h2>Pending Ideas</h2>
      {submissions.length === 0 ? (
        <p style={{ color: "#888" }} data-testid="board-empty">No ideas yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }} data-testid="board-list">
          {submissions.map((s) => (
            <li
              key={s.id}
              data-testid={`board-item-${s.id}`}
              style={{
                border: "1px solid #ddd",
                borderRadius: 4,
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <strong>{s.title}</strong>
              <span
                style={{
                  marginLeft: "0.5rem",
                  fontSize: "0.75rem",
                  color: "#888",
                  textTransform: "uppercase",
                }}
              >
                [{s.status}]
              </span>
              <p style={{ margin: "0.25rem 0 0" }}>{s.body}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
