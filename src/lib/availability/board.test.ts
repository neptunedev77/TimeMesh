import { describe, expect, it } from "vitest";
import {
  bestTimes,
  currentCellKey,
  dayBars,
  findMatches,
  heatBlocks,
  MEMBER_COLORS,
  memberColor,
  visibleTimes,
} from "./board";
import { rangeKeys } from "./grid";

const MONDAY = "2026-11-02";
const hours = (date: string, start: string, end: string) => rangeKeys(date, start, end, 30);

describe("dayBars", () => {
  const times = ["09:00", "09:30", "10:00", "10:30"];
  const dates = [MONDAY];
  const cells = (...hoursOfDay: string[]) => hoursOfDay.map((time) => `${MONDAY}T${time}`);

  it("gives a lone person the whole column, even in a group", () => {
    const [bar, ...rest] = dayBars([{ cells: [] }, { cells: cells("09:00", "09:30") }], dates, times);

    expect(rest).toEqual([]);
    expect(bar).toMatchObject({ memberIndex: 1, first: 0, span: 2, position: 0, count: 1 });
  });

  it("splits the column only while people overlap", () => {
    const bars = dayBars(
      [{ cells: cells("09:00", "09:30", "10:00") }, { cells: cells("09:30", "10:00", "10:30") }],
      dates,
      times,
    );

    expect(bars.map(({ memberIndex, first, span, position, count }) => [memberIndex, first, span, position, count])).toEqual([
      [0, 0, 1, 0, 1],
      [0, 1, 2, 0, 2],
      [1, 1, 2, 1, 2],
      [1, 3, 1, 0, 1],
    ]);
  });

  it("starts a new bar after a gap, and on each day", () => {
    const bars = dayBars(
      [{ cells: [`${MONDAY}T09:00`, `${MONDAY}T10:00`, "2026-11-03T09:00"] }],
      [MONDAY, "2026-11-03"],
      times,
    );

    expect(bars.map(({ column, first }) => [column, first])).toEqual([
      [0, 0],
      [0, 2],
      [1, 0],
    ]);
  });
});

describe("bar blocks", () => {
  it("marks the edges of an unbroken block, whoever is present", () => {
    const times = ["09:00", "09:30", "10:00"];
    const cells = (...list: string[]) => list.map((time) => `${MONDAY}T${time}`);
    const bars = dayBars([{ cells: cells("09:00", "09:30", "10:00") }, { cells: cells("09:30") }], [MONDAY], times).filter(
      ({ memberIndex }) => memberIndex === 0,
    );

    expect(bars.map(({ joinsAbove, startsBlock, endsBlock }) => [joinsAbove, startsBlock, endsBlock])).toEqual([
      [false, true, false],
      [true, false, false],
      [true, false, true],
    ]);
  });
});

describe("heatBlocks", () => {
  const times = ["09:00", "09:30", "10:00"];
  const a = [`${MONDAY}T09:00`, `${MONDAY}T09:30`, `${MONDAY}T10:00`];

  it("merges periods with the same number of people", () => {
    const blocks = heatBlocks([{ cells: a }, { cells: a.slice(1) }], new Set(), [MONDAY], times);

    expect(blocks.map(({ first, span, count }) => [first, span, count])).toEqual([
      [0, 1, 1],
      [1, 2, 2],
    ]);
  });

  it("separates the hours that are yours", () => {
    const blocks = heatBlocks([{ cells: a }], new Set([a[0]]), [MONDAY], times);

    expect(blocks.map(({ isMine, span }) => [isMine, span])).toEqual([
      [true, 1],
      [false, 2],
    ]);
  });
});

describe("currentCellKey", () => {
  it("uses the project's time zone and rounds down to a cell", () => {
    expect(currentCellKey(new Date("2026-07-01T20:44:00Z"), "Europe/Lisbon", 30)).toBe("2026-07-01T21:30");
    expect(currentCellKey(new Date("2026-07-01T23:10:00Z"), "Europe/Lisbon", 15)).toBe("2026-07-02T00:00");
  });
});

describe("visibleTimes", () => {
  const all = Array.from({ length: 48 }, (_, index) =>
    `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
  );

  it("shows the usual day when nothing is marked", () => {
    const times = visibleTimes(all, [], 30);

    expect(times[0]).toBe("09:00");
    expect(times.at(-1)).toBe("22:30");
  });

  it("widens to fit marked hours with an hour to spare", () => {
    const times = visibleTimes(all, [`${MONDAY}T07:00`, `${MONDAY}T23:00`], 30);

    expect(times[0]).toBe("06:00");
    expect(times.at(-1)).toBe("23:30");
  });

  it("stays within the day", () => {
    const times = visibleTimes(all, [`${MONDAY}T00:00`], 30);

    expect(times[0]).toBe("00:00");
  });
});

describe("memberColor", () => {
  it("reuses colors in large groups", () => {
    expect(memberColor(MEMBER_COLORS.length)).toBe(memberColor(0));
  });
});

describe("findMatches", () => {
  const person = (id: string, start: string, end: string) => ({
    id,
    name: id,
    cells: hours(MONDAY, start, end),
  });
  const find = (members: ReturnType<typeof person>[]) => findMatches(members, bestTimes(members, MONDAY, 30));

  it("waits until two people have responded", () => {
    expect(find([person("a", "09:00", "10:00"), { id: "b", name: "b", cells: [] }]).kind).toBe("waiting");
  });

  it("reports when people responded but don't overlap", () => {
    expect(find([person("a", "09:00", "10:00"), person("b", "11:00", "12:00")]).kind).toBe("none");
  });

  it("recognizes a time for everyone", () => {
    const state = find([person("a", "09:00", "11:00"), person("b", "10:00", "12:00")]);

    expect(state.kind).toBe("everyone");
    expect(state.kind === "everyone" && state.matches[0].startKey).toBe("2026-11-02T10:00");
  });

  it("recognizes a partial match when someone can't make it", () => {
    const state = find([
      person("a", "09:00", "11:00"),
      person("b", "10:00", "12:00"),
      person("c", "15:00", "16:00"),
    ]);

    expect(state.kind).toBe("partial");
  });

  it("returns every period with the largest group", () => {
    const shared = [...hours(MONDAY, "09:00", "10:00"), ...hours(MONDAY, "15:00", "16:00")];
    const members = [
      { id: "a", name: "a", cells: shared },
      { id: "b", name: "b", cells: shared },
    ];
    const state = findMatches(members, bestTimes(members, MONDAY, 30));

    expect(state.kind === "everyone" && state.matches).toHaveLength(2);
  });
});

describe("bestTimes", () => {
  it("puts the biggest group first", () => {
    const [best, second] = bestTimes(
      [
        { id: "a", name: "A", cells: hours(MONDAY, "14:00", "18:00") },
        { id: "b", name: "B", cells: hours(MONDAY, "14:00", "18:00") },
        { id: "c", name: "C", cells: hours(MONDAY, "15:00", "16:00") },
      ],
      MONDAY,
      30,
    );

    expect(best.participantIds).toEqual(["a", "b", "c"]);
    expect(best.startKey).toBe("2026-11-02T15:00");
    expect(best.endKey).toBe("2026-11-02T16:00");
    expect(second.participantIds).toEqual(["a", "b"]);
    expect(second.keys).toHaveLength(8);
  });

  it("prefers longer periods within the same group size", () => {
    const [best] = bestTimes(
      [
        { id: "a", name: "A", cells: [...hours(MONDAY, "09:00", "10:00"), ...hours(MONDAY, "14:00", "17:00")] },
        { id: "b", name: "B", cells: [...hours(MONDAY, "09:00", "10:00"), ...hours(MONDAY, "14:00", "17:00")] },
      ],
      MONDAY,
      30,
    );

    expect(best.startKey).toBe("2026-11-02T14:00");
  });

  it("keeps a period across midnight together", () => {
    const [best] = bestTimes([{ id: "a", name: "A", cells: hours(MONDAY, "22:00", "02:00") }], MONDAY, 30);

    expect(best.startKey).toBe("2026-11-02T22:00");
    expect(best.endKey).toBe("2026-11-03T02:00");
  });

  it("shows one person's own time before anyone else responds", () => {
    const times = bestTimes(
      [
        { id: "a", name: "A", cells: hours(MONDAY, "09:00", "10:00") },
        { id: "b", name: "B", cells: [] },
      ],
      MONDAY,
      30,
    );

    expect(times).toHaveLength(1);
  });

  it("hides times of one person once two have responded and overlap", () => {
    const times = bestTimes(
      [
        { id: "a", name: "A", cells: hours(MONDAY, "09:00", "11:00") },
        { id: "b", name: "B", cells: hours(MONDAY, "10:00", "12:00") },
      ],
      MONDAY,
      30,
    );

    expect(times.map(({ participantIds }) => participantIds)).toEqual([["a", "b"]]);
  });

  it("is empty without any responses, and ignores cells from other weeks", () => {
    expect(bestTimes([], MONDAY, 30)).toEqual([]);
    expect(bestTimes([{ id: "a", name: "A", cells: ["2026-11-09T09:00"] }], MONDAY, 30)).toEqual([]);
  });

  it("limits how many it returns", () => {
    const cells = [0, 1, 2, 3].map((day) => `2026-11-0${2 + day}T09:00`);

    expect(bestTimes([{ id: "a", name: "A", cells }], MONDAY, 30, 2)).toHaveLength(2);
  });
});
