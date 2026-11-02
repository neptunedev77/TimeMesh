import { rangeKeys } from "./grid";
import { isoWeekday } from "./timezone";

type Range = { start: string; end: string };

export type QuickSelection = {
  dates: string[];
  ranges: Range[];
  remove: boolean;
};

const DAY_NAMES = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
const DAY_PATTERN = "(seg|ter|qua|qui|sex|sab|dom)[a-z]*(?:-feira)?s?";
const CLOCK = "(\\d{1,2})(?:[:h](\\d{2})?)?";
const WHOLE_DAY: Range = { start: "09:00", end: "00:00" };
const PERIODS: [RegExp, Range][] = [
  [/\bmanhas?\b/, { start: "09:00", end: "13:00" }],
  [/\btardes?\b/, { start: "13:00", end: "19:00" }],
  [/\bnoites?\b/, { start: "19:00", end: "00:00" }],
  [/\b(dia todo|todo o dia|dia inteiro)\b/, WHOLE_DAY],
];

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Turns hour and minute text into HH:mm, with 24:00 written as midnight. Null when invalid. */
function clock(hours: string, minutes = "0"): string | null {
  const hour = Number(hours);
  const minute = Number(minutes);
  if (hour > 24 || minute > 59 || (hour === 24 && minute > 0)) return null;

  return `${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseDays(text: string, dates: string[], today: string) {
  let rest = text;
  const weekdays = new Set<number>();
  const take = (pattern: RegExp, onMatch: (match: RegExpExecArray) => void) => {
    for (let match = pattern.exec(rest); match; match = pattern.exec(rest)) {
      onMatch(match);
      rest = rest.replace(match[0], " ");
    }
  };
  const addAll = (...days: number[]) => days.forEach((day) => weekdays.add(day));
  const specific: string[] = [];

  take(/\bfim de semana\b|\bfds\b/, () => addAll(6, 7));
  take(/\bdias? ute?is\b/, () => addAll(1, 2, 3, 4, 5));
  take(/\b(todos os dias|toda a semana|sempre)\b/, () => addAll(1, 2, 3, 4, 5, 6, 7));
  take(/\bhoje\b/, () => specific.push(today));
  take(new RegExp(`\\b${DAY_PATTERN}\\s*(?:-|a|ate)\\s*${DAY_PATTERN}\\b`), ([, from, to]) => {
    const first = DAY_NAMES.indexOf(from);
    const last = DAY_NAMES.indexOf(to);
    for (let day = first; day <= (last < first ? last + 7 : last); day++) addAll((day % 7) + 1);
  });
  take(new RegExp(`\\b${DAY_PATTERN}\\b`), ([, name]) => addAll(DAY_NAMES.indexOf(name) + 1));

  const matched = dates.filter((date) => weekdays.has(isoWeekday(date)) || specific.includes(date));
  return { dates: matched, hasDays: weekdays.size > 0 || specific.length > 0, rest };
}

function parseRanges(text: string): Range[] | null {
  let rest = text;
  const ranges: Range[] = [];

  for (const [pattern, range] of PERIODS) {
    if (pattern.test(rest)) {
      ranges.push(range);
      rest = rest.replace(pattern, " ");
    }
  }

  const pairs = new RegExp(`${CLOCK}\\s*(?:-|–|ate as|ate|as|a)\\s*${CLOCK}`, "g");
  for (const [whole, h1, m1, h2, m2] of rest.matchAll(pairs)) {
    const start = clock(h1, m1);
    const end = clock(h2, m2);
    if (!start || !end) return null;
    ranges.push({ start, end });
    rest = rest.replace(whole, " ");
  }

  const after = new RegExp(`\\b(?:depois|a partir|apos)(?: d?[ao]s?)? ${CLOCK}`).exec(rest);
  if (after) {
    const start = clock(after[1], after[2]);
    if (!start) return null;
    ranges.push({ start, end: "00:00" });
    rest = rest.replace(after[0], " ");
  }

  const before = new RegExp(`\\b(?:antes|ate)(?: d?[ao]s?)? ${CLOCK}`).exec(rest);
  if (before) {
    const end = clock(before[1], before[2]);
    if (!end) return null;
    ranges.push({ start: "07:00", end });
    rest = rest.replace(before[0], " ");
  }

  return ranges;
}

/** Understands short Portuguese phrases such as "seg a sex 18-22" or "fim de semana à tarde". */
export function parseQuickInput(text: string, dates: string[], today: string): QuickSelection | null {
  const normalized = normalize(text);
  const remove = /^(nao|sem|tirar|tira|remover|limpar)\b/.test(normalized);
  const { dates: matched, hasDays, rest } = parseDays(normalized, dates, today);
  const ranges = parseRanges(rest);

  if (!ranges || (!hasDays && ranges.length === 0)) return null;

  return {
    dates: hasDays ? matched : dates,
    ranges: ranges.length > 0 ? ranges : [WHOLE_DAY],
    remove,
  };
}

export function quickSelectionKeys({ dates, ranges }: QuickSelection, slotMinutes: number): string[] {
  return dates.flatMap((date) => ranges.flatMap(({ start, end }) => rangeKeys(date, start, end, slotMinutes)));
}
