import { describe, expect, it } from "vitest";
import {
  type AvailabilityEntry,
  computeOverlaps,
  expandRecurringRules,
  filterOverlaps,
  localRangeToInterval,
  localToInstant,
  mergeIntervals,
  type Participant,
  type RecurringRule,
  resolveAvailability,
  resolvePreset,
  suggestSessions,
} from "./index";

const LISBON = "Europe/Lisbon";
const HOUR = 3_600_000;
const utc = (value: string) => Date.parse(`${value}Z`);

function entry(
  start: string,
  end: string,
  kind: AvailabilityEntry["kind"] = "available",
  source: AvailabilityEntry["source"] = "manual",
): AvailabilityEntry {
  return { start: utc(start), end: utc(end), kind, source };
}

function person(id: string, ...entries: AvailabilityEntry[]): Participant {
  return { id, entries };
}

// Winter dates, when Lisbon matches UTC.
const at = (time: string) => `2026-01-12T${time}:00`;

describe("computeOverlaps", () => {
  it("handles two people available at exactly the same time", () => {
    const [segment, ...rest] = computeOverlaps([
      person("a", entry(at("09:00"), at("12:00"))),
      person("b", entry(at("09:00"), at("12:00"))),
    ]);

    expect(rest).toEqual([]);
    expect(segment).toMatchObject({
      start: utc(at("09:00")),
      end: utc(at("12:00")),
      availableIds: ["a", "b"],
      unavailableIds: [],
      ratio: 1,
    });
  });

  it("splits partially overlapping intervals", () => {
    const segments = computeOverlaps([
      person("a", entry(at("09:00"), at("12:00"))),
      person("b", entry(at("11:00"), at("14:00"))),
    ]);

    expect(segments.map(({ availableIds }) => availableIds)).toEqual([["a"], ["a", "b"], ["b"]]);
    expect(segments[1]).toMatchObject({ start: utc(at("11:00")), end: utc(at("12:00")) });
    expect(segments[0].unavailableIds).toEqual(["b"]);
  });

  it("handles three people with different availability", () => {
    const segments = computeOverlaps([
      person("a", entry(at("09:00"), at("13:00"))),
      person("b", entry(at("10:00"), at("12:00"))),
      person("c", entry(at("11:00"), at("15:00"))),
    ]);

    expect(segments.map(({ availableIds }) => availableIds.join(""))).toEqual([
      "a",
      "ab",
      "abc",
      "ac",
      "c",
    ]);
  });

  it("tracks changing overlap across five people", () => {
    const segments = computeOverlaps([
      person("a", entry(at("09:00"), at("17:00"))),
      person("b", entry(at("10:00"), at("16:00"))),
      person("c", entry(at("11:00"), at("15:00"))),
      person("d", entry(at("12:00"), at("14:00"))),
      person("e", entry(at("13:00"), at("14:00"))),
    ]);

    expect(segments.map(({ availableIds }) => availableIds.length)).toEqual([
      1, 2, 3, 4, 5, 3, 2, 1,
    ]);
    expect(segments[4].ratio).toBe(1);
    expect(segments[3].ratio).toBe(0.8);
  });

  it("returns separate periods when nobody overlaps", () => {
    const segments = computeOverlaps([
      person("a", entry(at("09:00"), at("10:00"))),
      person("b", entry(at("11:00"), at("12:00"))),
    ]);

    expect(segments.every(({ availableIds }) => availableIds.length === 1)).toBe(true);
    expect(segments).toHaveLength(2);
  });

  it("does not split adjacent intervals from one person", () => {
    const segments = computeOverlaps([
      person("a", entry(at("09:00"), at("10:00")), entry(at("10:00"), at("11:00"))),
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ start: utc(at("09:00")), end: utc(at("11:00")) });
  });

  it("hands over cleanly between people at the same instant", () => {
    const segments = computeOverlaps([
      person("a", entry(at("09:00"), at("10:00"))),
      person("b", entry(at("10:00"), at("11:00"))),
    ]);

    expect(segments.map(({ availableIds }) => availableIds)).toEqual([["a"], ["b"]]);
  });

  it("counts a person once when their entries overlap", () => {
    const segments = computeOverlaps([
      person("a", entry(at("09:00"), at("11:00")), entry(at("10:00"), at("12:00"))),
      person("b", entry(at("09:00"), at("12:00"))),
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0].availableIds).toEqual(["a", "b"]);
  });

  it("counts people with no submission as unavailable", () => {
    const [segment] = computeOverlaps([person("a", entry(at("09:00"), at("10:00"))), person("b")]);

    expect(segment.unavailableIds).toEqual(["b"]);
    expect(segment.ratio).toBe(0.5);
    expect(computeOverlaps([person("a")])).toEqual([]);
    expect(computeOverlaps([])).toEqual([]);
  });

  it("keeps an overnight interval whole", () => {
    const monday = localRangeToInterval("2026-01-12", "22:00", "02:00", LISBON);
    const segments = computeOverlaps([
      person("a", { ...monday, kind: "available", source: "manual" }),
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      start: utc("2026-01-12T22:00:00"),
      end: utc("2026-01-13T02:00:00"),
    });
  });

  it("clips results to the requested window", () => {
    const [segment] = computeOverlaps([person("a", entry(at("09:00"), at("12:00")))], {
      start: utc(at("10:00")),
      end: utc(at("11:00")),
    });

    expect(segment).toMatchObject({ start: utc(at("10:00")), end: utc(at("11:00")) });
  });
});

describe("filterOverlaps", () => {
  const segments = computeOverlaps([
    person("a", entry(at("09:00"), at("13:00"))),
    person("b", entry(at("10:00"), at("13:00"))),
    person("c", entry(at("11:00"), at("13:00"))),
    person("d", entry(at("12:00"), at("13:00"))),
  ]);

  it("filters by group size and share", () => {
    expect(filterOverlaps(segments, { minRatio: 1 })).toHaveLength(1);
    expect(filterOverlaps(segments, { minRatio: 0.75 })).toHaveLength(2);
    expect(filterOverlaps(segments, { minRatio: 0.5 })).toHaveLength(3);
    expect(filterOverlaps(segments, { minCount: 2 })).toHaveLength(3);
  });

  it("filters by selected people", () => {
    expect(filterOverlaps(segments, { requiredIds: ["c", "d"] })).toHaveLength(1);
  });
});

describe("resolveAvailability", () => {
  const recurring = entry(at("09:00"), at("17:00"), "available", "recurring");

  it("lets date-specific unavailability override recurring availability", () => {
    expect(
      resolveAvailability([recurring, entry(at("12:00"), at("13:00"), "unavailable", "exception")]),
    ).toEqual([
      { start: utc(at("09:00")), end: utc(at("12:00")) },
      { start: utc(at("13:00")), end: utc(at("17:00")) },
    ]);
  });

  it("lets a date-specific entry override recurring unavailability", () => {
    expect(
      resolveAvailability([
        entry(at("09:00"), at("17:00"), "unavailable", "recurring"),
        entry(at("10:00"), at("11:00"), "available", "exception"),
      ]),
    ).toEqual([{ start: utc(at("10:00")), end: utc(at("11:00")) }]);
  });

  it("gives the same result regardless of entry order", () => {
    const entries = [
      recurring,
      entry(at("10:00"), at("12:00"), "unavailable"),
      entry(at("11:00"), at("18:00")),
    ];
    const expected = [
      { start: utc(at("09:00")), end: utc(at("10:00")) },
      { start: utc(at("12:00")), end: utc(at("18:00")) },
    ];

    expect(resolveAvailability(entries)).toEqual(expected);
    expect(resolveAvailability([...entries].reverse())).toEqual(expected);
  });
});

describe("mergeIntervals", () => {
  it("ignores empty and inverted intervals", () => {
    expect(
      mergeIntervals([
        { start: 5, end: 5 },
        { start: 9, end: 3 },
      ]),
    ).toEqual([]);
  });
});

describe("resolvePreset", () => {
  it("uses each person's schedule for the entire day", () => {
    const day = resolvePreset("entireDay", { startTime: "09:00", endTime: "23:00" });
    const lateDay = resolvePreset("entireDay", { startTime: "11:00", endTime: "02:00" });

    const interval = localRangeToInterval("2026-01-13", day.startTime, day.endTime, LISBON);
    const lateInterval = localRangeToInterval(
      "2026-01-13",
      lateDay.startTime,
      lateDay.endTime,
      LISBON,
    );

    expect(interval).toEqual({
      start: utc("2026-01-13T09:00:00"),
      end: utc("2026-01-13T23:00:00"),
    });
    expect(lateInterval).toEqual({
      start: utc("2026-01-13T11:00:00"),
      end: utc("2026-01-14T02:00:00"),
    });
  });

  it("uses named presets, including the overnight one", () => {
    const usual = { startTime: "09:00", endTime: "23:00" };

    expect(resolvePreset("morning", usual)).toEqual({ startTime: "08:00", endTime: "12:00" });
    expect(resolvePreset("night", usual)).toEqual({ startTime: "23:00", endTime: "08:00" });
  });
});

describe("recurring schedules", () => {
  const rules: RecurringRule[] = [
    { weekday: 1, startTime: "09:00", endTime: "18:00", kind: "available" },
    { weekday: 2, startTime: "22:00", endTime: "02:00", kind: "available" },
  ];

  it("repeats every week", () => {
    const mondays = expandRecurringRules([rules[0]], "2026-01-12", "2026-01-25", LISBON);

    expect(mondays.map(({ start }) => start)).toEqual([
      utc("2026-01-12T09:00:00"),
      utc("2026-01-19T09:00:00"),
    ]);
    expect(mondays[0].source).toBe("recurring");
  });

  it("includes an overnight rule from the day before the range", () => {
    const entries = expandRecurringRules([rules[1]], "2026-01-14", "2026-01-14", LISBON);

    expect(entries).toHaveLength(1);
    expect(entries[0].end).toBe(utc("2026-01-14T02:00:00"));
  });

  it("keeps the local time across daylight saving changes", () => {
    const rule: RecurringRule = {
      weekday: 1,
      startTime: "20:00",
      endTime: "21:00",
      kind: "available",
    };
    const entries = expandRecurringRules([rule], "2026-03-23", "2026-03-30", LISBON);

    expect(entries.map(({ start }) => start)).toEqual([
      utc("2026-03-23T20:00:00"),
      utc("2026-03-30T19:00:00"),
    ]);
  });

  it("keeps exceptions when the schedule changes", () => {
    const exception = entry("2026-01-12T10:00:00", "2026-01-12T11:00:00", "unavailable", "exception");
    const newRule: RecurringRule = {
      weekday: 1,
      startTime: "08:00",
      endTime: "12:00",
      kind: "available",
    };
    const entries = [
      ...expandRecurringRules([newRule], "2026-01-12", "2026-01-12", LISBON),
      exception,
    ];

    expect(resolveAvailability(entries)).toEqual([
      { start: utc("2026-01-12T08:00:00"), end: utc("2026-01-12T10:00:00") },
      { start: utc("2026-01-12T11:00:00"), end: utc("2026-01-12T12:00:00") },
    ]);
  });
});

describe("time zones and daylight saving", () => {
  it("compares actual instants across time zones", () => {
    const lisbon = localRangeToInterval("2026-01-12", "14:00", "16:00", LISBON);
    const newYork = localRangeToInterval("2026-01-12", "09:00", "11:00", "America/New_York");
    const tokyo = localRangeToInterval("2026-01-12", "23:00", "01:00", "Asia/Tokyo");

    expect(lisbon).toEqual(newYork);
    expect(tokyo.start).toBe(utc("2026-01-12T14:00:00"));
    expect(tokyo.end).toBe(utc("2026-01-12T16:00:00"));
  });

  it("uses the summer offset in Lisbon", () => {
    expect(localToInstant("2026-07-01", "12:00", LISBON)).toBe(utc("2026-07-01T11:00:00"));
  });

  it("moves a skipped time forward to the first valid time", () => {
    expect(localToInstant("2026-03-29", "01:30", LISBON)).toBe(utc("2026-03-29T01:00:00"));
    expect(localToInstant("2026-03-08", "02:30", "America/New_York")).toBe(
      utc("2026-03-08T07:00:00"),
    );
  });

  it("uses the first occurrence of a repeated time", () => {
    expect(localToInstant("2026-10-25", "01:30", LISBON)).toBe(utc("2026-10-25T00:30:00"));
    expect(localToInstant("2026-11-01", "01:30", "America/New_York")).toBe(
      utc("2026-11-01T05:30:00"),
    );
  });

  it("measures real elapsed time on changeover days", () => {
    const spring = localRangeToInterval("2026-03-29", "00:00", "04:00", LISBON);
    const autumn = localRangeToInterval("2026-10-25", "00:00", "04:00", LISBON);

    expect(spring.end - spring.start).toBe(3 * HOUR);
    expect(autumn.end - autumn.start).toBe(5 * HOUR);
  });

  it("drops a range that falls entirely inside a skipped hour", () => {
    const skipped = localRangeToInterval("2026-03-29", "01:15", "01:45", LISBON);

    expect(mergeIntervals([skipped])).toEqual([]);
  });

  it("rejects an unknown time zone", () => {
    expect(() => localToInstant("2026-01-12", "09:00", "Mars/Olympus")).toThrow(RangeError);
  });
});

describe("suggestSessions", () => {
  const segments = computeOverlaps([
    person("a", entry(at("14:00"), at("17:30"))),
    person("b", entry(at("14:00"), at("17:30"))),
    person("c", entry(at("15:00"), at("16:00"))),
  ]);

  it("ranks larger groups first and keeps the full smaller-group period", () => {
    const suggestions = suggestSessions(segments);

    expect(suggestions[0]).toMatchObject({
      start: utc(at("15:00")),
      end: utc(at("16:00")),
      participantIds: ["a", "b", "c"],
    });
    expect(suggestions[1]).toMatchObject({
      start: utc(at("14:00")),
      end: utc(at("17:30")),
      participantIds: ["a", "b"],
    });
  });

  it("finds a long session spanning changes in the wider group", () => {
    const [suggestion, ...rest] = suggestSessions(segments, { minDurationMs: 2 * HOUR });

    expect(rest).toEqual([]);
    expect(suggestion.participantIds).toEqual(["a", "b"]);
  });

  it("applies a maximum duration without changing the segments", () => {
    const before = structuredClone(segments);
    const [, suggestion] = suggestSessions(segments, { maxDurationMs: HOUR });

    expect(suggestion.end - suggestion.start).toBe(HOUR);
    expect(segments).toEqual(before);
  });

  it("prefers the closest duration within the same group size", () => {
    const split = computeOverlaps([
      person("a", entry(at("09:00"), at("09:30")), entry(at("14:00"), at("15:00"))),
    ]);

    expect(suggestSessions(split, { preferredDurationMs: HOUR })[0].start).toBe(utc(at("14:00")));
    expect(suggestSessions(split)[0].start).toBe(utc(at("09:00")));
  });

  it("respects the minimum group size", () => {
    expect(suggestSessions(segments, { minCount: 4 })).toEqual([]);
  });
});
