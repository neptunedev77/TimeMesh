"use client";

import { memo, useEffect, useRef, useState } from "react";
import { locale, messages } from "@/i18n";
import type { BestTime } from "@/lib/availability/board";
import { cellKey, rangeKeys } from "@/lib/availability/grid";
import { cn } from "@/lib/utils";

const copy = messages.board;
const dateLabel = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" });
const COLUMNS = "grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))]";

const PERIODS = [
  { label: copy.periods.morning, start: "09:00", end: "13:00" },
  { label: copy.periods.afternoon, start: "13:00", end: "19:00" },
  { label: copy.periods.evening, start: "19:00", end: "00:00" },
];

type GridProps = {
  dates: string[];
  plannedDates: readonly string[];
  times: string[];
  today: string;
  slotMinutes: number;
  total: number;
  counts: ReadonlyMap<string, number>;
  backgrounds: ReadonlyMap<string, string>;
  mine: ReadonlySet<string>;
  myColor: string;
  matches: BestTime[];
  isFullMatch: boolean;
  highlight: ReadonlySet<string> | null;
  readOnly: boolean;
  onPaint: (keys: string[], add: boolean, base: ReadonlySet<string>) => void;
  onInspect: (key: string | null) => void;
};

type CellProps = {
  id: string;
  column: number;
  row: number;
  label: string;
  background: string | undefined;
  isMine: boolean;
  isDimmed: boolean;
  isFocusable: boolean;
  isHourStart: boolean;
  disabled: boolean;
};

const Cell = memo(function Cell({
  id,
  column,
  row,
  label,
  background,
  isMine,
  isDimmed,
  isFocusable,
  isHourStart,
  disabled,
}: CellProps) {
  return (
    <button
      id={id}
      type="button"
      data-column={column}
      data-row={row}
      disabled={disabled}
      tabIndex={isFocusable ? 0 : -1}
      aria-label={label}
      aria-pressed={isMine}
      style={{ backgroundImage: background }}
      className={cn(
        "relative block h-7 w-full touch-none border-l bg-card transition-opacity duration-200 ease-out outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed sm:h-6",
        isHourStart && "border-t",
        !disabled && "hover:brightness-90",
        isDimmed && "opacity-25",
      )}
    />
  );
});

/** Splits a period into one rectangle per day, as positions on the visible grid. */
function matchRectangles(match: BestTime, dates: string[], times: string[], slotMinutes: number) {
  const byColumn = new Map<number, number[]>();

  for (const key of match.keys) {
    const [date, time] = key.split("T");
    const column = dates.indexOf(date);
    const row = times.indexOf(time);
    if (column >= 0 && row >= 0) byColumn.set(column, [...(byColumn.get(column) ?? []), row]);
  }

  return [...byColumn].map(([column, rows]) => {
    const first = Math.min(...rows);
    const last = Math.max(...rows);
    const span = last - first + 1;

    return {
      column,
      first,
      span,
      label: `${times[first]}–${times[last + 1] ?? "00:00"}`,
      isTall: (span * slotMinutes) / 30 >= 2,
    };
  });
}

export function BoardGrid({
  dates,
  plannedDates,
  times,
  today,
  slotMinutes,
  total,
  counts,
  backgrounds,
  mine,
  myColor,
  matches,
  isFullMatch,
  highlight,
  readOnly,
  onPaint,
  onInspect,
}: GridProps) {
  const drag = useRef<{ column: number; row: number; add: boolean; base: ReadonlySet<string> } | null>(null);
  const handledByPointer = useRef(false);
  const [focusable, setFocusable] = useState({
    column: Math.max(0, dates.findIndex((date) => plannedDates.includes(date))),
    row: 0,
  });

  useEffect(() => {
    const stop = () => {
      drag.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  function cellFrom(target: EventTarget) {
    const element = (target as Element).closest?.<HTMLElement>("[data-column]");
    if (!element || (element as HTMLButtonElement).disabled) return null;

    const column = Number(element.dataset.column);
    const row = Number(element.dataset.row);
    return { column, row, key: cellKey(dates[column], times[row]) };
  }

  function rectangle(fromColumn: number, fromRow: number, toColumn: number, toRow: number) {
    const keys: string[] = [];
    for (let column = Math.min(fromColumn, toColumn); column <= Math.max(fromColumn, toColumn); column++) {
      if (!plannedDates.includes(dates[column])) continue;
      for (let row = Math.min(fromRow, toRow); row <= Math.max(fromRow, toRow); row++) {
        keys.push(cellKey(dates[column], times[row]));
      }
    }
    return keys;
  }

  const isAllMine = (keys: string[]) => keys.length > 0 && keys.every((key) => mine.has(key));
  const toggleAll = (keys: string[]) => onPaint(keys, !isAllMine(keys), mine);
  const periodKeys = (date: string, period: (typeof PERIODS)[number]) =>
    rangeKeys(date, period.start, period.end, slotMinutes);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className={cn(COLUMNS, "border-b bg-muted/40")}>
        <span />
        {dates.map((date, column) => (
          <button
            key={date}
            type="button"
            disabled={!plannedDates.includes(date) || readOnly}
            aria-label={`${copy.fillDay} ${messages.weekdays[column]}`}
            onClick={() => toggleAll(times.filter((time) => time >= "09:00").map((time) => cellKey(date, time)))}
            className={cn(
              "flex flex-col items-center gap-0.5 border-l py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring enabled:hover:bg-muted",
              !plannedDates.includes(date) && "opacity-40",
            )}
          >
            <span className="text-muted-foreground">{messages.weekdays[column]}</span>
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-sm",
                date === today && "bg-primary text-primary-foreground",
              )}
            >
              {dateLabel.format(new Date(`${date}T00:00:00Z`))}
            </span>
          </button>
        ))}
      </div>

      {!readOnly &&
        PERIODS.map((period) => (
          <div key={period.label} className={cn(COLUMNS, "border-b")}>
            <button
              type="button"
              aria-label={`${copy.fillPeriod} ${period.label}`}
              onClick={() => toggleAll(plannedDates.flatMap((date) => periodKeys(date, period)))}
              className="truncate px-0.5 text-center text-[0.625rem] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              {period.label}
            </button>
            {dates.map((date, column) => {
              const keys = periodKeys(date, period);
              const planned = plannedDates.includes(date);
              const on = isAllMine(keys);
              const partial = !on && keys.some((key) => mine.has(key));

              return (
                <div key={date} className="border-l p-0.5">
                  <button
                    type="button"
                    disabled={!planned}
                    aria-pressed={on}
                    aria-label={`${messages.weekdays[column]}, ${period.label}`}
                    onClick={() => toggleAll(keys)}
                    style={on ? { backgroundColor: myColor } : partial ? { backgroundColor: `${myColor}40` } : undefined}
                    className={cn(
                      "block h-8 w-full rounded-md bg-muted/60 transition-[background-color,transform] duration-150 outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 sm:h-7",
                      planned && !on && "hover:bg-muted",
                    )}
                  />
                </div>
              );
            })}
          </div>
        ))}

      <div className="flex">
        {/* The only part of the grid that scrolls by touch, since cells paint when dragged. */}
        <div className="w-11 shrink-0 touch-pan-y">
          {times.map((time) => (
            <button
              key={time}
              type="button"
              disabled={readOnly}
              tabIndex={time.endsWith(":00") ? 0 : -1}
              aria-label={`${copy.fillPeriod} ${time}`}
              onClick={() => toggleAll(plannedDates.map((date) => cellKey(date, time)))}
              className={cn(
                "block h-7 w-full touch-pan-y pr-1.5 text-right text-[0.6875rem] leading-none text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring enabled:hover:bg-muted sm:h-6",
                time.endsWith(":00") && "border-t",
              )}
            >
              {time.endsWith(":00") ? time : ""}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <div
            role="grid"
            aria-label={copy.gridLabel}
            className="grid grid-cols-7 select-none"
            onPointerDown={(event) => {
              const cell = cellFrom(event.target);
              if (!cell || event.button !== 0) return;
              // Touch would otherwise keep every move on the first cell touched.
              (event.target as Element).releasePointerCapture?.(event.pointerId);
              setFocusable({ column: cell.column, row: cell.row });
              onInspect(cell.key);
              handledByPointer.current = true;
              const add = !mine.has(cell.key);
              drag.current = { column: cell.column, row: cell.row, add, base: mine };
              onPaint([cell.key], add, mine);
            }}
            onPointerOver={(event) => {
              const cell = cellFrom(event.target);
              if (!cell) return;
              onInspect(cell.key);
              if (drag.current) {
                const { column, row, add, base } = drag.current;
                onPaint(rectangle(column, row, cell.column, cell.row), add, base);
              }
            }}
            onPointerLeave={() => onInspect(null)}
            onFocus={(event) => {
              const cell = cellFrom(event.target);
              if (cell) onInspect(cell.key);
            }}
            onClick={(event) => {
              if (handledByPointer.current) {
                handledByPointer.current = false;
                return;
              }
              const cell = cellFrom(event.target);
              if (cell) onPaint([cell.key], !mine.has(cell.key), mine);
            }}
            onKeyDown={(event) => {
              const cell = cellFrom(event.target);
              const move = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
              if (!cell || !move) return;

              event.preventDefault();
              const column = Math.min(6, Math.max(0, cell.column + move[0]));
              const row = Math.min(times.length - 1, Math.max(0, cell.row + move[1]));
              document.getElementById(`cell-${column}-${row}`)?.focus();
            }}
          >
            {dates.map((date, column) => (
              <div key={date} role="row" className="min-w-0">
                {times.map((time, row) => {
                  const key = cellKey(date, time);
                  const planned = plannedDates.includes(date);
                  const isMine = mine.has(key);

                  return (
                    <Cell
                      key={key}
                      id={`cell-${column}-${row}`}
                      column={column}
                      row={row}
                      label={`${messages.weekdays[column]} ${dateLabel.format(new Date(`${date}T00:00:00Z`))}, ${time}, ${counts.get(key) ?? 0} ${copy.outOf} ${total} ${copy.available}${isMine ? `, ${copy.you}` : ""}`}
                      background={planned ? backgrounds.get(key) : undefined}
                      isMine={isMine}
                      isDimmed={!planned || (highlight !== null && !highlight.has(key))}
                      isFocusable={column === focusable.column && row === focusable.row}
                      isHourStart={time.endsWith(":00")}
                      disabled={!planned || readOnly}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {matches.flatMap((match) =>
              matchRectangles(match, dates, times, slotMinutes).map(({ column, first, span, label, isTall }) => (
                <div
                  key={`${match.startKey}-${column}-${first}-${span}`}
                  style={{
                    left: `${(column / 7) * 100}%`,
                    width: `${100 / 7}%`,
                    top: `${(first / times.length) * 100}%`,
                    height: `${(span / times.length) * 100}%`,
                  }}
                  className={cn(
                    "absolute z-10 flex items-center justify-center rounded-lg p-0.5 duration-500 animate-in fade-in-0 zoom-in-90 motion-reduce:animate-none",
                    isFullMatch
                      ? "shadow-[0_0_0_3px_var(--foreground),0_0_18px_4px_rgb(16_185_129/0.7)]"
                      : "shadow-[0_0_0_2px_var(--foreground)]",
                  )}
                >
                  {isTall && (
                    <span className="rounded-md bg-foreground px-1 py-0.5 text-center text-[0.625rem] leading-tight font-semibold text-background tabular-nums sm:px-1.5 sm:text-xs">
                      {label}
                    </span>
                  )}
                </div>
              )),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
