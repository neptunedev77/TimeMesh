import { addDays, isoWeekday, localRangeToInterval } from "./timezone";
import type { AvailabilityEntry, RecurringRule } from "./types";

/**
 * Expands weekly rules for an inclusive range of local dates.
 * Starts one day early so overnight rules from the previous day are included.
 */
export function expandRecurringRules(
  rules: RecurringRule[],
  fromDate: string,
  toDate: string,
  timeZone: string,
): AvailabilityEntry[] {
  const entries: AvailabilityEntry[] = [];

  for (let date = addDays(fromDate, -1); date <= toDate; date = addDays(date, 1)) {
    const weekday = isoWeekday(date);

    for (const rule of rules) {
      if (rule.weekday !== weekday) continue;

      entries.push({
        ...localRangeToInterval(date, rule.startTime, rule.endTime, timeZone),
        kind: rule.kind,
        source: "recurring",
      });
    }
  }

  return entries;
}
