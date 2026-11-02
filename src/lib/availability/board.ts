import { cellKey, nextCellKey, slotTimes, weekDates } from "./grid";
import { computeOverlaps } from "./overlaps";
import { suggestSessions } from "./suggestions";

export type BoardMember = {
  id: string;
  name: string;
  cells: string[];
};

export type BestTime = {
  keys: string[];
  startKey: string;
  endKey: string;
  participantIds: string[];
};

export const MEMBER_COLORS = [
  "#2563eb",
  "#e11d48",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

/**
 * Paints a cell as one vertical lane per member, always in the same order, so each person
 * forms a continuous bar and a shared hour fills the whole cell.
 */
export function laneBackground(memberIndexes: number[], total: number): string | undefined {
  if (memberIndexes.length === 0 || total === 0) return undefined;

  const width = 100 / total;
  const stops = memberIndexes.map((index) => {
    const start = index * width;
    return `${memberColor(index)} ${start}% ${start + width}%`;
  });
  const gaps = Array.from({ length: total }, (_, index) => index)
    .filter((index) => !memberIndexes.includes(index))
    .map((index) => `transparent ${index * width}% ${(index + 1) * width}%`);
  const ordered = [...stops, ...gaps].sort((a, b) => parseFloat(a.split(" ")[1]) - parseFloat(b.split(" ")[1]));

  return `linear-gradient(90deg, ${ordered.join(", ")})`;
}

export type MatchState =
  | { kind: "waiting" }
  | { kind: "none" }
  | { kind: "partial" | "everyone"; matches: BestTime[] };

/** What the group has found so far. The top matches are all periods with the largest group. */
export function findMatches(members: BoardMember[], times: BestTime[]): MatchState {
  const responded = members.filter(({ cells }) => cells.length > 0).length;
  if (responded < 2) return { kind: "waiting" };

  const shared = times.filter(({ participantIds }) => participantIds.length >= 2);
  if (shared.length === 0) return { kind: "none" };

  const largest = shared[0].participantIds.length;
  return {
    kind: largest === members.length ? "everyone" : "partial",
    matches: shared.filter(({ participantIds }) => participantIds.length === largest),
  };
}

/**
 * Ranks the week's best moments with the compatibility engine, using positions on the
 * grid as its time scale: bigger groups first, then longer periods, then earliest.
 */
export function bestTimes(
  members: BoardMember[],
  weekStart: string,
  slotMinutes: number,
  limit = 5,
): BestTime[] {
  const keys = weekDates(weekStart).flatMap((date) =>
    slotTimes(slotMinutes).map((time) => cellKey(date, time)),
  );
  const positions = new Map(keys.map((key, index) => [key, index]));

  const participants = members.map(({ id, cells }) => ({
    id,
    entries: cells.flatMap((key) => {
      const position = positions.get(key);
      return position === undefined
        ? []
        : [{ start: position, end: position + 1, kind: "available" as const, source: "manual" as const }];
    }),
  }));
  const responded = participants.filter(({ entries }) => entries.length > 0).length;

  return suggestSessions(computeOverlaps(participants), { minCount: Math.min(2, responded) })
    .sort(
      (a, b) =>
        b.participantIds.length - a.participantIds.length ||
        b.end - b.start - (a.end - a.start) ||
        a.start - b.start,
    )
    .slice(0, limit)
    .map(({ start, end, participantIds }) => ({
      keys: keys.slice(start, end),
      startKey: keys[start],
      endKey: nextCellKey(keys[end - 1], slotMinutes),
      participantIds,
    }));
}
