import type { Interval } from "./types";

/** Sorts intervals and joins the ones that overlap or touch, dropping empty ones. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter(({ start, end }) => end > start)
    .sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];

  for (const { start, end } of sorted) {
    const last = merged.at(-1);
    if (last && start <= last.end) {
      last.end = Math.max(last.end, end);
    } else {
      merged.push({ start, end });
    }
  }

  return merged;
}

/** Removes the removed time from the base intervals. */
export function subtractIntervals(base: Interval[], removed: Interval[]): Interval[] {
  const toRemove = mergeIntervals(removed);
  const result: Interval[] = [];

  for (const interval of mergeIntervals(base)) {
    let cursor = interval.start;

    for (const { start, end } of toRemove) {
      if (end <= cursor) continue;
      if (start >= interval.end) break;
      if (start > cursor) result.push({ start: cursor, end: start });
      cursor = Math.max(cursor, end);
    }

    if (cursor < interval.end) result.push({ start: cursor, end: interval.end });
  }

  return result;
}

export function clipIntervals(intervals: Interval[], window: Interval): Interval[] {
  return intervals
    .map(({ start, end }) => ({
      start: Math.max(start, window.start),
      end: Math.min(end, window.end),
    }))
    .filter(({ start, end }) => end > start);
}
