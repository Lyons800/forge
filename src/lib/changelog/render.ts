/**
 * changelog/render.ts
 *
 * Pure data-transformation utilities for rendering changelog entries in the UI.
 * Extracted from the page component so this logic can be unit-tested and reused.
 */

export type ChangelogRenderEntry = {
  id: number;
  title: string;
  body: string;
  shippedAt: Date;
};

export type DateGroup = {
  date: string; // "YYYY-MM-DD"
  entries: ChangelogRenderEntry[];
};

/**
 * Format a Date to the "YYYY-MM-DD" ISO day string (UTC).
 */
export function formatShipDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Group a pre-sorted (newest-first) list of entries by calendar date.
 * Returns an array of date groups, newest date first.
 * Preserves the incoming entry order within each group.
 */
export function groupEntriesByDate(entries: ChangelogRenderEntry[]): DateGroup[] {
  const groups: DateGroup[] = [];
  const indexByDate = new Map<string, number>();

  for (const entry of entries) {
    const date = formatShipDate(entry.shippedAt);
    const idx = indexByDate.get(date);
    if (idx === undefined) {
      indexByDate.set(date, groups.length);
      groups.push({ date, entries: [entry] });
    } else {
      groups[idx].entries.push(entry);
    }
  }

  return groups;
}
