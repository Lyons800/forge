export type ChangelogEntry = { title: string; body: string; shippedAt: Date };
const esc = (s: string) => s.replace(/([#*_`])/g, "\\$1");
const day = (d: Date) => d.toISOString().slice(0, 10);

export function generateChangelogMarkdown(entries: ChangelogEntry[]): string {
  if (entries.length === 0) return "_No changes yet._";
  const sorted = [...entries].sort((a, b) => b.shippedAt.getTime() - a.shippedAt.getTime());
  const out: string[] = [];
  let lastDay = "";
  for (const e of sorted) {
    const d = day(e.shippedAt);
    if (d !== lastDay) { out.push(`## ${d}`); lastDay = d; }
    out.push(`### ${esc(e.title)}`, "", e.body, "");
  }
  return out.join("\n");
}
