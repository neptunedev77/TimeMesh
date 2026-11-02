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

export type DayBar = {
  memberIndex: number;
  column: number;
  first: number;
  span: number;
  /** This person's place among those present, so a lone person fills the whole column. */
  position: number;
  count: number;
  keys: string[];
  /** The same person continues directly above, in a different width. */
  joinsAbove: boolean;
  /** Whether this bar touches the top or bottom of the unbroken block it belongs to. */
  startsBlock: boolean;
  endsBlock: boolean;
};

export type HeatBlock = {
  column: number;
  first: number;
  span: number;
  count: number;
  isMine: boolean;
  keys: string[];
};

/** For large groups: one block per period where the number of people stays the same. */
export function heatBlocks(
  people: { cells: readonly string[] }[],
  mine: ReadonlySet<string>,
  dates: string[],
  times: string[],
): HeatBlock[] {
  const counts = new Map<string, number>();
  people.forEach(({ cells }) => cells.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1)));
  const blocks: HeatBlock[] = [];

  dates.forEach((date, column) => {
    let open: HeatBlock | null = null;

    times.forEach((time, row) => {
      const key = cellKey(date, time);
      const count = counts.get(key) ?? 0;
      const isMine = mine.has(key);

      if (count === 0) {
        open = null;
      } else if (open && open.count === count && open.isMine === isMine) {
        open.span += 1;
        open.keys.push(key);
      } else {
        open = { column, first: row, span: 1, count, isMine, keys: [key] };
        blocks.push(open);
      }
    });
  });

  return blocks;
}

/** The cell a moment falls in, in a project's time zone. Earlier cells have already passed. */
export function currentCellKey(now: Date, timeZone: string, slotMinutes: number): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  const [hours, minutes] = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(now)
    .split(":")
    .map(Number);
  const slot = minutes - (minutes % slotMinutes);

  return cellKey(date, `${String(hours).padStart(2, "0")}:${String(slot).padStart(2, "0")}`);
}

const DEFAULT_FIRST_TIME = "09:00";
const DEFAULT_LAST_TIME = "23:00";

/** The rows worth showing: the usual day, widened to fit marked hours with an hour to spare. */
export function visibleTimes(allTimes: string[], usedKeys: Iterable<string>, slotMinutes: number): string[] {
  const usedRows = [...usedKeys]
    .map((key) => allTimes.indexOf(key.split("T")[1]))
    .filter((row) => row >= 0);
  const margin = 60 / slotMinutes;
  const defaultFirst = allTimes.indexOf(DEFAULT_FIRST_TIME);
  const defaultEnd = allTimes.indexOf(DEFAULT_LAST_TIME);
  const first = Math.min(defaultFirst, ...usedRows.map((row) => row - margin));
  const end = Math.max(defaultEnd, ...usedRows.map((row) => row + 1 + margin));

  return allTimes.slice(Math.max(0, first), Math.min(allTimes.length, end));
}

/** Draws everyone's hours as bars that share a column only with the people present at that time. */
export function dayBars(people: { cells: readonly string[] }[], dates: string[], times: string[]): DayBar[] {
  const owned = people.map(({ cells }) => new Set(cells));
  const bars: DayBar[] = [];

  dates.forEach((date, column) => {
    let open = new Map<number, DayBar>();
    const columnBars: DayBar[] = [];
    const occupied: boolean[] = [];

    times.forEach((time, row) => {
      const key = cellKey(date, time);
      const present = owned.flatMap((cells, index) => (cells.has(key) ? [index] : []));
      occupied[row] = present.length > 0;
      const next = new Map<number, DayBar>();

      present.forEach((memberIndex, position) => {
        const previous = open.get(memberIndex);
        if (previous && previous.position === position && previous.count === present.length) {
          previous.span += 1;
          previous.keys.push(key);
          next.set(memberIndex, previous);
        } else {
          const bar: DayBar = {
            memberIndex,
            column,
            first: row,
            span: 1,
            position,
            count: present.length,
            keys: [key],
            joinsAbove: Boolean(previous),
            startsBlock: false,
            endsBlock: false,
          };
          columnBars.push(bar);
          bars.push(bar);
          next.set(memberIndex, bar);
        }
      });

      open = next;
    });

    for (const bar of columnBars) {
      bar.startsBlock = !occupied[bar.first - 1];
      bar.endsBlock = !occupied[bar.first + bar.span];
    }
  });

  return bars;
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
