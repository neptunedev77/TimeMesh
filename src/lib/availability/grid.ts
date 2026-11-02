import { addDays, isoWeekday } from "./timezone";

// A cell is a local date and time, such as 2026-11-02T08:30. Overrides hold what a person
// chose for a week; anything without an override follows their recurring schedule.
export type CellOverride = "available" | "unavailable";
export type Overrides = Record<string, CellOverride>;
export type CellDisplay = CellOverride | "inherited" | "none";
export type Tool = "available" | "unavailable";
export type Paint = "available" | "unavailable" | "clear" | "revert";

const CELL_KEY = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

export const cellKey = (date: string, time: string) => `${date}T${time}`;

export function mondayOf(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function slotTimes(slotMinutes: number): string[] {
  return Array.from({ length: 1440 / slotMinutes }, (_, index) => formatMinutes(index * slotMinutes));
}

export function nextCellKey(key: string, slotMinutes: number): string {
  const [date, time] = key.split("T");
  const minutes = toMinutes(time) + slotMinutes;

  return minutes >= 1440 ? cellKey(addDays(date, 1), "00:00") : cellKey(date, formatMinutes(minutes));
}

/** The cells a local range covers, widened to whole cells. An end at or before the start ends the next day. */
export function rangeKeys(date: string, startTime: string, endTime: string, slotMinutes: number): string[] {
  const start = toMinutes(startTime);
  const end = cellKey(endTime <= startTime ? addDays(date, 1) : date, endTime);
  const keys: string[] = [];

  let key = cellKey(date, formatMinutes(start - (start % slotMinutes)));
  while (key < end) {
    keys.push(key);
    key = nextCellKey(key, slotMinutes);
  }

  return keys;
}

export function displayOf(key: string, overrides: Overrides, inherited: ReadonlySet<string>): CellDisplay {
  return overrides[key] ?? (inherited.has(key) ? "inherited" : "none");
}

/** What a click or drag does, decided by the first cell, so a drag can both select and deselect. */
export function paintFor(display: CellDisplay, tool: Tool): Paint {
  if (tool === "available") {
    return display === "available" || display === "inherited" ? "clear" : "available";
  }
  return display === "unavailable" ? "revert" : "unavailable";
}

export function applyPaint(
  overrides: Overrides,
  keys: string[],
  paint: Paint,
  inherited: ReadonlySet<string>,
): Overrides {
  const result = { ...overrides };

  for (const key of keys) {
    delete result[key];
    if (paint === "unavailable" || (paint === "clear" && inherited.has(key))) {
      result[key] = "unavailable";
    } else if (paint === "available" && !inherited.has(key)) {
      result[key] = "available";
    }
  }

  return result;
}

export function copyDay(
  overrides: Overrides,
  inherited: ReadonlySet<string>,
  fromDate: string,
  toDate: string,
  slotMinutes: number,
): Overrides {
  let result = overrides;

  for (const time of slotTimes(slotMinutes)) {
    const display = displayOf(cellKey(fromDate, time), overrides, inherited);
    const paint: Paint =
      display === "unavailable"
        ? "unavailable"
        : display === "none"
          ? "clear"
          : "available";
    result = applyPaint(result, [cellKey(toDate, time)], paint, inherited);
  }

  return result;
}

/** Moves a week's choices by whole days, keeping their local times. */
export function shiftOverrides(overrides: Overrides, days: number): Overrides {
  return Object.fromEntries(
    Object.entries(overrides).map(([key, value]) => {
      const [date, time] = key.split("T");
      return [cellKey(addDays(date, days), time), value];
    }),
  );
}

/** Checks choices sent by a browser: only cells on the grid, on the given dates. */
export function isValidOverrides(
  overrides: unknown,
  allowedDates: readonly string[],
  slotMinutes: number,
): overrides is Overrides {
  if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) return false;

  return Object.entries(overrides).every(([key, value]) => {
    if (!CELL_KEY.test(key) || (value !== "available" && value !== "unavailable")) return false;

    const [date, time] = key.split("T");
    return allowedDates.includes(date) && toMinutes(time) % slotMinutes === 0;
  });
}
