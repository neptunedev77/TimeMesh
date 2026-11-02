import { describe, expect, it } from "vitest";
import { bestTimes, findMatches, MEMBER_COLORS, memberColor } from "./board";
import { rangeKeys } from "./grid";

const MONDAY = "2026-11-02";
const hours = (date: string, start: string, end: string) => rangeKeys(date, start, end, 30);

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
