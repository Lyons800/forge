/**
 * board/format.ts
 *
 * Pure presentation helpers for the Improvement Board UI.
 * Extracted from the page component so this logic can be unit-tested
 * and reused. No DB, no React — just deterministic string formatting.
 */

export type BoardStatus = "pending" | "approved" | string;

/**
 * Human-readable label for a board submission status.
 *
 * Only `pending` and `approved` ever reach the public board (the API filters
 * out `needs_review`), so those are the meaningful cases. Any unknown status
 * is title-cased as a safe fallback rather than leaking a raw enum value.
 */
export function statusLabel(status: BoardStatus): string {
  switch (status) {
    case "pending":
      return "Pending review";
    case "approved":
      return "Shipping soon";
    default:
      // Safe fallback: "in_progress" -> "In progress"
      if (!status) return "Unknown";
      const spaced = status.replace(/[_-]+/g, " ").trim();
      return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  }
}

/**
 * Tone token for a status, used to pick an accent vs. neutral pill style.
 * `approved` items are the "good news" state and get the accent treatment.
 */
export function statusTone(status: BoardStatus): "accent" | "neutral" {
  return status === "approved" ? "accent" : "neutral";
}

/**
 * Compact relative-time formatter ("just now", "5m ago", "3h ago",
 * "2d ago", "3w ago", or an absolute YYYY-MM-DD for anything older).
 *
 * @param value  ISO date string or Date for the event being described.
 * @param now    Reference "current" time (injectable for deterministic tests).
 */
export function relativeTime(value: string | Date, now: Date = new Date()): string {
  const then = value instanceof Date ? value : new Date(value);
  const thenMs = then.getTime();
  if (Number.isNaN(thenMs)) return "";

  const diffMs = now.getTime() - thenMs;

  // Future or clock-skew: treat as "just now" rather than negative output.
  if (diffMs < 0) return "just now";

  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 45) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.floor(day / 7)}w ago`;

  // Older than ~a month: fall back to an absolute UTC day stamp.
  return then.toISOString().slice(0, 10);
}
