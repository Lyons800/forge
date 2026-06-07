import { db } from "@/lib/db";
import { listChangelogEntries } from "@/lib/changelog/repo";
import { generateChangelogMarkdown } from "@/lib/changelog/generate";

export const dynamic = "force-dynamic";

export default async function BuildLogPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = db ? await listChangelogEntries(db as any) : [];
  const markdown = generateChangelogMarkdown(entries);

  // Simple markdown → HTML: render headings and paragraphs without a dep.
  // We keep it minimal: convert ## and ### headings, bold, and paragraphs.
  const html = markdownToHtml(markdown);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 720 }}>
      <h1>Build Log</h1>
      <p style={{ color: "#666" }}>
        Public changelog — every improvement shipped to Forge.
      </p>
      <hr />
      <div
        data-testid="buildlog-content"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ lineHeight: 1.6 }}
      />
    </main>
  );
}

/** Minimal markdown to HTML: handles ## h2, ### h3, _em_, and paragraphs. */
function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inParagraph = false;

  for (const raw of lines) {
    const line = raw;
    if (line.startsWith("### ")) {
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
      out.push(`<h3>${escHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
      out.push(`<h2>${escHtml(line.slice(3))}</h2>`);
    } else if (line.trim() === "") {
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
    } else {
      // Inline: _text_ → <em>text</em>
      const inlined = escHtml(line).replace(/_(.*?)_/g, "<em>$1</em>");
      if (!inParagraph) { out.push("<p>"); inParagraph = true; }
      out.push(inlined);
    }
  }
  if (inParagraph) out.push("</p>");
  return out.join("\n");
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
