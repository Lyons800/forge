export type RawSubmission = { title: string; body: string };
export type Submission = { title: string; body: string; status: "pending" | "needs_review" };
const INJECTION = /(ignore (previous|all) instructions|system prompt|you are now|disregard)/i;
// strip ASCII control chars (0x00-0x1F and 0x7F), preserve normal whitespace/printables
const stripControl = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, "").trim();
export function sanitiseSubmission(raw: RawSubmission): Submission {
  const title = stripControl(raw.title).slice(0, 120);
  const body = stripControl(raw.body).slice(0, 4000);
  const status = INJECTION.test(`${title} ${body}`) ? "needs_review" : "pending";
  return { title, body, status };
}
