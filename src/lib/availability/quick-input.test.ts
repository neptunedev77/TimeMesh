import { describe, expect, it } from "vitest";
import { weekDates } from "./grid";
import { parseQuickInput, quickSelectionKeys } from "./quick-input";

const WEEK = weekDates("2026-11-02");
const TODAY = "2026-11-04";
const parse = (text: string) => parseQuickInput(text, WEEK, TODAY);

describe("parseQuickInput", () => {
  it("reads a day range with hours", () => {
    expect(parse("seg a sex 18-22")).toEqual({
      dates: WEEK.slice(0, 5),
      ranges: [{ start: "18:00", end: "22:00" }],
      remove: false,
    });
  });

  it.each([
    ["dias úteis à noite", 5, { start: "19:00", end: "00:00" }],
    ["fim de semana de manhã", 2, { start: "09:00", end: "13:00" }],
    ["todas as tardes", 7, { start: "13:00", end: "19:00" }],
    ["quinta das 9 às 13", 1, { start: "09:00", end: "13:00" }],
    ["sexta-feira depois das 18", 1, { start: "18:00", end: "00:00" }],
    ["seg antes das 12", 1, { start: "07:00", end: "12:00" }],
    ["terça 18h30 às 20h", 1, { start: "18:30", end: "20:00" }],
    ["hoje 20-23", 1, { start: "20:00", end: "23:00" }],
  ])("understands %s", (text, days, range) => {
    const result = parse(text);

    expect(result?.dates).toHaveLength(days);
    expect(result?.ranges).toEqual([range]);
  });

  it("uses today's date for hoje", () => {
    expect(parse("hoje")?.dates).toEqual([TODAY]);
  });

  it("uses all days when only a time is given", () => {
    expect(parse("18-20")?.dates).toEqual(WEEK);
  });

  it("uses the whole day when only a day is given", () => {
    expect(parse("sábado")?.ranges).toEqual([{ start: "09:00", end: "00:00" }]);
  });

  it("accepts several periods and separate days", () => {
    const result = parse("seg e qua manhã e noite");

    expect(result?.dates).toEqual([WEEK[0], WEEK[2]]);
    expect(result?.ranges).toHaveLength(2);
  });

  it("wraps a day range around the weekend", () => {
    expect(parse("sex a dom")?.dates).toEqual(WEEK.slice(4));
  });

  it("recognizes a removal", () => {
    expect(parse("não posso sexta")?.remove).toBe(true);
    expect(parse("sem manhãs")?.remove).toBe(true);
  });

  it.each(["", "olá", "amanhã talvez não sei", "seg 30-40"])("rejects %s", (text) => {
    expect(parse(text)).toBeNull();
  });
});

describe("quickSelectionKeys", () => {
  it("turns a selection into cells", () => {
    const selection = parse("seg 18-19")!;

    expect(quickSelectionKeys(selection, 30)).toEqual(["2026-11-02T18:00", "2026-11-02T18:30"]);
  });

  it("carries an overnight range into the next day", () => {
    expect(quickSelectionKeys(parse("seg 23-1")!, 60)).toEqual(["2026-11-02T23:00", "2026-11-03T00:00"]);
  });
});
