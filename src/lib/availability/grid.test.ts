import { describe, expect, it } from "vitest";
import {
  applyPaint,
  cellKey,
  copyDay,
  displayOf,
  isValidOverrides,
  mondayOf,
  nextCellKey,
  type Overrides,
  paintFor,
  rangeKeys,
  shiftOverrides,
  slotTimes,
  weekDates,
} from "./grid";
import { entriesToOverrides, inheritedCells, overridesToEntries, weekWindow } from "./week-data";

const LISBON = "Europe/Lisbon";
const MONDAY = "2026-01-12";
const none = new Set<string>();

function fill(date: string, start: string, end: string, value: Overrides[string] = "available"): Overrides {
  return Object.fromEntries(rangeKeys(date, start, end, 30).map((key) => [key, value]));
}

describe("grid helpers", () => {
  it("treats Monday as the first day of the week", () => {
    expect(mondayOf("2026-01-12")).toBe("2026-01-12");
    expect(mondayOf("2026-01-18")).toBe("2026-01-12");
    expect(weekDates(MONDAY).at(-1)).toBe("2026-01-18");
  });

  it("builds slots for both grid sizes", () => {
    expect(slotTimes(30)).toHaveLength(48);
    expect(slotTimes(15)).toHaveLength(96);
    expect(slotTimes(15)[1]).toBe("00:15");
  });

  it("rolls into the next day at midnight", () => {
    expect(nextCellKey("2026-01-12T23:30", 30)).toBe("2026-01-13T00:00");
  });

  it("covers overnight ranges and widens to whole cells", () => {
    expect(rangeKeys(MONDAY, "23:00", "01:00", 30)).toEqual([
      "2026-01-12T23:00",
      "2026-01-12T23:30",
      "2026-01-13T00:00",
      "2026-01-13T00:30",
    ]);
    expect(rangeKeys(MONDAY, "09:10", "09:40", 30)).toEqual(["2026-01-12T09:00", "2026-01-12T09:30"]);
  });
});

describe("painting cells", () => {
  const key = cellKey(MONDAY, "09:00");
  const inherited = new Set([key]);

  it("selects and deselects based on the first cell", () => {
    expect(paintFor("none", "available")).toBe("available");
    expect(paintFor("available", "available")).toBe("clear");
    expect(paintFor("inherited", "available")).toBe("clear");
    expect(paintFor("none", "unavailable")).toBe("unavailable");
    expect(paintFor("unavailable", "unavailable")).toBe("revert");
  });

  it("removes a plain selection entirely", () => {
    expect(applyPaint({ [key]: "available" }, [key], "clear", none)).toEqual({});
  });

  it("marks inherited time unavailable when deselected, and restores it", () => {
    const cleared = applyPaint({}, [key], "clear", inherited);

    expect(displayOf(key, cleared, inherited)).toBe("unavailable");
    expect(displayOf(key, applyPaint(cleared, [key], "available", inherited), inherited)).toBe("inherited");
    expect(displayOf(key, applyPaint(cleared, [key], "revert", inherited), inherited)).toBe("inherited");
  });

  it("does not store an override when availability matches the schedule", () => {
    expect(applyPaint({}, [key], "available", inherited)).toEqual({});
  });
});

describe("copying", () => {
  it("copies one day onto another", () => {
    const copied = copyDay(fill(MONDAY, "09:00", "10:00"), none, MONDAY, "2026-01-13", 30);

    expect(copied["2026-01-13T09:30"]).toBe("available");
    expect(copied["2026-01-12T09:30"]).toBe("available");
  });

  it("replaces what the target day had", () => {
    const start = { ...fill(MONDAY, "09:00", "10:00"), ...fill("2026-01-13", "15:00", "16:00") };
    const copied = copyDay(start, none, MONDAY, "2026-01-13", 30);

    expect(copied["2026-01-13T15:00"]).toBeUndefined();
  });

  it("moves a week to the next one", () => {
    expect(shiftOverrides({ "2026-01-12T09:00": "unavailable" }, 7)).toEqual({ "2026-01-19T09:00": "unavailable" });
  });
});

describe("overridesToEntries", () => {
  it("keeps an overnight selection as one interval", () => {
    expect(overridesToEntries(fill(MONDAY, "22:00", "02:00"), 30, LISBON)).toEqual([
      {
        starts_at: "2026-01-12T22:00:00.000Z",
        ends_at: "2026-01-13T02:00:00.000Z",
        kind: "available",
        source: "manual",
      },
    ]);
  });

  it("separates gaps and kinds", () => {
    const entries = overridesToEntries(
      {
        ...fill(MONDAY, "09:00", "10:00"),
        ...fill(MONDAY, "10:00", "11:00", "unavailable"),
        ...fill(MONDAY, "12:00", "13:00"),
      },
      30,
      LISBON,
    );

    expect(entries.map(({ kind, source }) => `${kind}/${source}`)).toEqual([
      "available/manual",
      "unavailable/exception",
      "available/manual",
    ]);
  });

  it("round-trips through stored entries", () => {
    const overrides = { ...fill(MONDAY, "22:00", "23:30"), ...fill("2026-01-14", "08:00", "09:00", "unavailable") };

    expect(entriesToOverrides(overridesToEntries(overrides, 30, LISBON), MONDAY, 30, LISBON)).toEqual(overrides);
  });

  it("uses summer time in stored instants", () => {
    const [entry] = overridesToEntries(fill("2026-07-06", "12:00", "13:00"), 30, LISBON);

    expect(entry.starts_at).toBe("2026-07-06T11:00:00.000Z");
  });

  it("drops cells entirely inside an hour skipped by daylight saving", () => {
    expect(overridesToEntries(fill("2026-03-29", "01:00", "02:00"), 30, LISBON)).toEqual([]);
  });

  it("spans the skipped hour without losing real time", () => {
    const [entry] = overridesToEntries(fill("2026-03-29", "00:00", "03:00"), 30, LISBON);

    expect(Date.parse(entry.ends_at) - Date.parse(entry.starts_at)).toBe(2 * 3_600_000);
  });
});

describe("weekWindow", () => {
  it("is shorter on a week that loses an hour", () => {
    const { start, end } = weekWindow("2026-03-23", LISBON);

    expect(end - start).toBe(167 * 3_600_000);
  });
});

describe("inheritedCells", () => {
  it("follows the recurring schedule, including overnight into the next day", () => {
    const cells = inheritedCells(
      [{ weekday: 1, startTime: "23:00", endTime: "01:00", kind: "available" }],
      MONDAY,
      30,
      LISBON,
    );

    expect(cells).toEqual(["2026-01-12T23:00", "2026-01-12T23:30", "2026-01-13T00:00", "2026-01-13T00:30"]);
  });

  it("picks up an overnight rule from the Sunday before", () => {
    const cells = inheritedCells(
      [{ weekday: 7, startTime: "23:00", endTime: "01:00", kind: "available" }],
      MONDAY,
      30,
      LISBON,
    );

    expect(cells).toContain("2026-01-12T00:30");
  });
});

describe("isValidOverrides", () => {
  const dates = [MONDAY];

  it("accepts cells on the grid", () => {
    expect(isValidOverrides({ "2026-01-12T09:30": "available" }, dates, 30)).toBe(true);
  });

  it.each([
    ["another date", { "2026-01-13T09:00": "available" }],
    ["an unaligned time", { "2026-01-12T09:10": "available" }],
    ["an unknown state", { "2026-01-12T09:00": "busy" }],
    ["a malformed key", { "2026-01-12 09:00; drop": "available" }],
    ["an array", []],
    ["nothing", null],
  ])("rejects %s", (_name, value) => {
    expect(isValidOverrides(value, dates, 30)).toBe(false);
  });
});
