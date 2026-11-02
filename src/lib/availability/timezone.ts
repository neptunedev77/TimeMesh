import { tzOffset } from "@date-fns/tz";
import type { Interval } from "./types";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function offsetAt(timeZone: string, instant: number): number {
  const minutes = tzOffset(timeZone, new Date(instant));
  if (Number.isNaN(minutes)) {
    throw new RangeError(`Unknown time zone: ${timeZone}`);
  }
  return minutes * MINUTE;
}

function parseDate(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date: string, days: number): string {
  return new Date(parseDate(date) + days * DAY).toISOString().slice(0, 10);
}

export function isoWeekday(date: string): number {
  return new Date(parseDate(date)).getUTCDay() || 7;
}

/**
 * Converts a local date and time to an instant.
 * A time skipped by daylight saving moves forward to the first valid time.
 * A time repeated by daylight saving resolves to its first occurrence.
 */
export function localToInstant(date: string, time: string, timeZone: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  const wall = parseDate(date) + hours * 60 * MINUTE + minutes * MINUTE;

  const offsets = [offsetAt(timeZone, wall - DAY), offsetAt(timeZone, wall + DAY)];
  const valid = offsets
    .map((offset) => wall - offset)
    .filter((instant) => offsetAt(timeZone, instant) === wall - instant);

  if (valid.length > 0) {
    return Math.min(...valid);
  }

  // No offset fits, so the time was skipped: search for the moment the clocks changed.
  let low = wall - Math.max(...offsets);
  let high = wall - Math.min(...offsets);
  const lowOffset = offsetAt(timeZone, low);

  while (high - low > MINUTE) {
    const middle = low + Math.floor((high - low) / (2 * MINUTE)) * MINUTE;
    if (offsetAt(timeZone, middle) === lowOffset) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return high;
}

/** Converts a local time range to instants; an end at or before the start ends on the next day. */
export function localRangeToInterval(
  date: string,
  startTime: string,
  endTime: string,
  timeZone: string,
): Interval {
  const endDate = endTime <= startTime ? addDays(date, 1) : date;

  return {
    start: localToInstant(date, startTime, timeZone),
    end: localToInstant(endDate, endTime, timeZone),
  };
}
