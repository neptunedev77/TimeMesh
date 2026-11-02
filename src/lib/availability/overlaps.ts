import { clipIntervals } from "./intervals";
import { resolveAvailability } from "./resolve";
import type { Interval, OverlapSegment, Participant } from "./types";

/**
 * Sweeps through availability changes and returns each period where the set of
 * available participants stays the same. Periods with nobody available are omitted.
 */
export function computeOverlaps(participants: Participant[], window?: Interval): OverlapSegment[] {
  const changes = new Map<number, { joined: string[]; left: string[] }>();

  const changeAt = (time: number) => {
    let change = changes.get(time);
    if (!change) {
      change = { joined: [], left: [] };
      changes.set(time, change);
    }
    return change;
  };

  for (const { id, entries } of participants) {
    const resolved = resolveAvailability(entries);

    for (const { start, end } of window ? clipIntervals(resolved, window) : resolved) {
      changeAt(start).joined.push(id);
      changeAt(end).left.push(id);
    }
  }

  const times = [...changes.keys()].sort((a, b) => a - b);
  const allIds = participants.map(({ id }) => id).sort();
  const active = new Set<string>();
  const segments: OverlapSegment[] = [];

  times.forEach((time, index) => {
    const { joined, left } = changes.get(time)!;
    left.forEach((id) => active.delete(id));
    joined.forEach((id) => active.add(id));

    if (active.size > 0 && index + 1 < times.length) {
      segments.push({
        start: time,
        end: times[index + 1],
        availableIds: allIds.filter((id) => active.has(id)),
        unavailableIds: allIds.filter((id) => !active.has(id)),
        ratio: active.size / allIds.length,
      });
    }
  });

  return segments;
}

export type OverlapFilter = {
  minCount?: number;
  minRatio?: number;
  requiredIds?: string[];
};

export function filterOverlaps(
  segments: OverlapSegment[],
  { minCount = 0, minRatio = 0, requiredIds = [] }: OverlapFilter,
): OverlapSegment[] {
  return segments.filter(
    ({ availableIds, ratio }) =>
      availableIds.length >= minCount &&
      ratio >= minRatio &&
      requiredIds.every((id) => availableIds.includes(id)),
  );
}
