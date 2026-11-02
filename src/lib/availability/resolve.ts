import { mergeIntervals, subtractIntervals } from "./intervals";
import type { AvailabilityEntry, AvailabilityKind, Interval } from "./types";

function pick(entries: AvailabilityEntry[], kind: AvailabilityKind, recurring: boolean): Interval[] {
  return entries.filter(
    (entry) => entry.kind === kind && (entry.source === "recurring") === recurring,
  );
}

/**
 * Returns when one participant is available. Row order never affects the result:
 * date-specific entries beat recurring ones, and within a level unavailability wins.
 */
export function resolveAvailability(entries: AvailabilityEntry[]): Interval[] {
  const specificUnavailable = pick(entries, "unavailable", false);
  const specificAvailable = subtractIntervals(
    pick(entries, "available", false),
    specificUnavailable,
  );
  const recurringAvailable = subtractIntervals(pick(entries, "available", true), [
    ...pick(entries, "unavailable", true),
    ...specificUnavailable,
  ]);

  return mergeIntervals([...specificAvailable, ...recurringAvailable]);
}
