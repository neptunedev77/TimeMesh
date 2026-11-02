import { cellKey, nextCellKey, type Overrides, slotTimes, weekDates } from "./grid";
import { resolveAvailability } from "./resolve";
import { expandRecurringRules } from "./recurring";
import { addDays, localToInstant } from "./timezone";
import type { AvailabilityKind, Interval, RecurringRule } from "./types";

export type StoredEntry = {
  starts_at: string;
  ends_at: string;
  kind: AvailabilityKind;
};

export type EntryRow = StoredEntry & {
  source: "manual" | "exception";
};

function cellInstant(key: string, timeZone: string): number {
  const [date, time] = key.split("T");
  return localToInstant(date, time, timeZone);
}

function cellInterval(key: string, slotMinutes: number, timeZone: string): Interval {
  return {
    start: cellInstant(key, timeZone),
    end: cellInstant(nextCellKey(key, slotMinutes), timeZone),
  };
}

export function weekWindow(weekStart: string, timeZone: string): Interval {
  return {
    start: localToInstant(weekStart, "00:00", timeZone),
    end: localToInstant(addDays(weekStart, 7), "00:00", timeZone),
  };
}

/** Joins consecutive cells into intervals, so Monday 22:00 to Tuesday 02:00 stays one entry. */
export function overridesToEntries(overrides: Overrides, slotMinutes: number, timeZone: string): EntryRow[] {
  const entries: EntryRow[] = [];
  let run: { first: string; last: string; kind: AvailabilityKind } | undefined;

  const closeRun = () => {
    if (!run) return;

    const start = cellInstant(run.first, timeZone);
    const end = cellInstant(nextCellKey(run.last, slotMinutes), timeZone);
    // A run entirely inside an hour skipped by daylight saving has no duration.
    if (end > start) {
      entries.push({
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
        kind: run.kind,
        source: run.kind === "available" ? "manual" : "exception",
      });
    }
  };

  for (const key of Object.keys(overrides).sort()) {
    const kind = overrides[key];

    if (run && run.kind === kind && nextCellKey(run.last, slotMinutes) === key) {
      run.last = key;
    } else {
      closeRun();
      run = { first: key, last: key, kind };
    }
  }
  closeRun();

  return entries;
}

function weekCells(weekStart: string, slotMinutes: number, timeZone: string) {
  return weekDates(weekStart)
    .flatMap((date) => slotTimes(slotMinutes).map((time) => cellKey(date, time)))
    .map((key) => ({ key, ...cellInterval(key, slotMinutes, timeZone) }))
    .filter(({ start, end }) => end > start);
}

export function entriesToOverrides(
  entries: StoredEntry[],
  weekStart: string,
  slotMinutes: number,
  timeZone: string,
): Overrides {
  const parsed = entries.map(({ starts_at, ends_at, kind }) => ({
    start: Date.parse(starts_at),
    end: Date.parse(ends_at),
    kind,
  }));
  const overrides: Overrides = {};

  for (const { key, start } of weekCells(weekStart, slotMinutes, timeZone)) {
    const matching = parsed.filter((entry) => entry.start <= start && start < entry.end);

    if (matching.some(({ kind }) => kind === "unavailable")) {
      overrides[key] = "unavailable";
    } else if (matching.length > 0) {
      overrides[key] = "available";
    }
  }

  return overrides;
}

/** The cells a person's recurring schedule covers in this week. */
export function inheritedCells(
  rules: RecurringRule[],
  weekStart: string,
  slotMinutes: number,
  timeZone: string,
): string[] {
  const intervals = resolveAvailability(
    expandRecurringRules(rules, weekStart, addDays(weekStart, 6), timeZone),
  );

  return weekCells(weekStart, slotMinutes, timeZone)
    .filter(({ start }) => intervals.some((interval) => interval.start <= start && start < interval.end))
    .map(({ key }) => key);
}
