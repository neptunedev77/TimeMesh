import type { Interval, OverlapSegment } from "./types";

export type SuggestionOptions = {
  minCount?: number;
  minDurationMs?: number;
  preferredDurationMs?: number;
  maxDurationMs?: number;
};

export type SessionSuggestion = Interval & {
  participantIds: string[];
};

/** For each distinct group, finds the continuous periods when all of its members are available. */
function findGroupRuns(segments: OverlapSegment[], minCount: number): SessionSuggestion[] {
  const groups = new Map(segments.map(({ availableIds }) => [availableIds.join("\n"), availableIds]));
  const runs: SessionSuggestion[] = [];

  for (const participantIds of groups.values()) {
    if (participantIds.length < minCount) continue;
    let current: SessionSuggestion | undefined;

    for (const { start, end, availableIds } of segments) {
      if (!participantIds.every((id) => availableIds.includes(id))) continue;

      if (current?.end === start) {
        current.end = end;
      } else {
        current = { start, end, participantIds };
        runs.push(current);
      }
    }
  }

  return runs;
}

/** Drops a run when a larger group covers the same period. */
function keepLargestGroups(runs: SessionSuggestion[]): SessionSuggestion[] {
  return runs.filter(
    (run) =>
      !runs.some(
        (other) =>
          other.participantIds.length > run.participantIds.length &&
          other.start <= run.start &&
          other.end >= run.end &&
          run.participantIds.every((id) => other.participantIds.includes(id)),
      ),
  );
}

/**
 * Ranks possible sessions: larger groups first, then closest to the preferred
 * duration, then earliest. The segments themselves are left untouched.
 */
export function suggestSessions(
  segments: OverlapSegment[],
  { minCount = 1, minDurationMs = 0, preferredDurationMs, maxDurationMs }: SuggestionOptions = {},
): SessionSuggestion[] {
  const fit = (duration: number) =>
    preferredDurationMs === undefined ? 0 : Math.abs(duration - preferredDurationMs);

  return keepLargestGroups(findGroupRuns(segments, minCount))
    .filter(({ start, end }) => end - start >= minDurationMs)
    .map((run) => ({
      ...run,
      end: maxDurationMs === undefined ? run.end : Math.min(run.end, run.start + maxDurationMs),
    }))
    .sort(
      (a, b) =>
        b.participantIds.length - a.participantIds.length ||
        fit(a.end - a.start) - fit(b.end - b.start) ||
        a.start - b.start,
    );
}
