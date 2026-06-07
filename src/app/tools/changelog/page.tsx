"use client";

import { useState } from "react";
import { generateChangelogMarkdown } from "@/lib/changelog/generate";

type Entry = { id: number; title: string; body: string; shippedAt: string };

export default function ChangelogToolPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Compute preview during render — no effect needed
  const preview = generateChangelogMarkdown(
    entries.map((e) => ({ title: e.title, body: e.body, shippedAt: new Date(e.shippedAt) }))
  );

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      setErrorMsg("Title and body are required.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/changelog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      const newEntry: Entry = await res.json();
      setEntries((prev) => [newEntry, ...prev]);
      setTitle("");
      setBody("");
      setStatus("idle");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 700 }}>
      <h1>Changelog Tool</h1>
      <p>Add a new changelog entry below. Requires authentication.</p>

      {status === "error" && (
        <p style={{ color: "red" }} data-testid="error-message">
          {errorMsg}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="changelog-title"
          style={{ padding: "0.4rem" }}
        />
        <textarea
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          data-testid="changelog-body"
          rows={4}
          style={{ padding: "0.4rem" }}
        />
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          data-testid="changelog-save"
          style={{ padding: "0.5rem 1rem", alignSelf: "flex-start" }}
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>

      <h2>Markdown Preview</h2>
      <pre
        data-testid="changelog-preview"
        style={{
          background: "#f4f4f4",
          padding: "1rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {preview}
      </pre>
    </main>
  );
}
