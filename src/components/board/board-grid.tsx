"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { locale, messages } from "@/i18n";
import type { BestTime } from "@/lib/availability/board";
import { cellKey } from "@/lib/availability/grid";
import { isoWeekday } from "@/lib/availability/timezone";
import { cn } from "@/lib/utils";

const copy = messages.board;
const dateLabel = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" });
const COLUMN_PADDING = 3;
const LANE_GAP = 2;

export type GridPerson = {
  id: string;
  color: string;
  cells: readonly string[];
};

type GridProps = {
  dates: string[];
  plannedDates: readonly string[];
  times: string[];
  today: string;
  people: GridPerson[];
  counts: ReadonlyMap<string, number>;
  mine: ReadonlySet<string>;
  matches: BestTime[];
  isFullMatch: boolean;
  highlight: ReadonlySet<string> | null;
  highlightedPerson: string | null;
  readOnly: boolean;
  onPaint: (keys: string[], add: boolean, base: ReadonlySet<string>) => void;
  onInspect: (key: string | null) => void;
};

type CellProps = {
  id: string;
  column: number;
  row: number;
  label: string;
  isMine: boolean;
  isAnchor: boolean;
  isFocusable: boolean;
  isHourStart: boolean;
  isWeekend: boolean;
  isToday: boolean;
  disabled: boolean;
};

const Cell = memo(function Cell({
  id,
  column,
  row,
  label,
  isMine,
  isAnchor,
  isFocusable,
  isHourStart,
  isWeekend,
  isToday,
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
      className={cn(
        "relative block h-7 w-full touch-none border-l border-border/60 transition-colors duration-100 outline-none focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed sm:h-6",
        isHourStart ? "border-t border-t-border/70" : "border-t border-t-border/20",
        isWeekend && "bg-muted/40",
        isToday && "bg-primary/[0.04]",
        disabled ? "bg-muted/70" : "hover:bg-foreground/[0.06]",
        isAnchor && "ring-2 ring-foreground/40 ring-inset",
      )}
    />
  );
});

/** Groups one person's cells into a continuous bar per day. */
function personBars(person: GridPerson, dates: string[], times: string[]) {
  const owned = new Set(person.cells);
  const bars: { column: number; first: number; span: number; keys: string[] }[] = [];

  dates.forEach((date, column) => {
    let current: (typeof bars)[number] | null = null;

    times.forEach((time, row) => {
      const key = cellKey(date, time);
      if (!owned.has(key)) {
        current = null;
      } else if (current) {
        current.span += 1;
        current.keys.push(key);
      } else {
        current = { column, first: row, span: 1, keys: [key] };
        bars.push(current);
      }
    });
  });

  return bars;
}

/** Splits a period into one rectangle per day, as positions on the visible grid. */
function matchRectangles(match: BestTime, dates: string[], times: string[]) {
  const byColumn = new Map<number, number[]>();

  for (const key of match.keys) {
    const [date, time] = key.split("T");
    const column = dates.indexOf(date);
    const row = times.indexOf(time);
    if (column >= 0 && row >= 0) byColumn.set(column, [...(byColumn.get(column) ?? []), row]);
  }

  return [...byColumn].map(([column, rows]) => ({
    column,
    first: Math.min(...rows),
    span: Math.max(...rows) - Math.min(...rows) + 1,
  }));
}

export function BoardGrid({
  dates,
  plannedDates,
  times,
  today,
  people,
  counts,
  mine,
  matches,
  isFullMatch,
  highlight,
  highlightedPerson,
  readOnly,
  onPaint,
  onInspect,
}: GridProps) {
  const drag = useRef<{ column: number; row: number; add: boolean; base: ReadonlySet<string> } | null>(null);
  const handledByPointer = useRef(false);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [focusable, setFocusable] = useState({
    column: Math.max(0, dates.findIndex((date) => plannedDates.includes(date))),
    row: 0,
  });
  const lanes = useMemo(
    () => people.map((person, lane) => ({ ...person, lane, bars: personBars(person, dates, times) })),
    [people, dates, times],
  );

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

  /** Fills from the anchor to this cell, giving the whole range the anchor's state. */
  function extendFromAnchor(column: number, row: number) {
    if (!anchor) return false;

    const [date, time] = anchor.split("T");
    const anchorColumn = dates.indexOf(date);
    const anchorRow = times.indexOf(time);
    if (anchorColumn < 0 || anchorRow < 0) return false;

    onPaint(rectangle(anchorColumn, anchorRow, column, row), mine.has(anchor), mine);
    return true;
  }

  const toggleAll = (keys: string[]) => onPaint(keys, !(keys.length > 0 && keys.every((key) => mine.has(key))), mine);
  const percent = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <div className="overflow-clip rounded-2xl border bg-card shadow-xs">
      <div className="sticky top-0 z-40 grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] border-b bg-card/95 backdrop-blur-sm">
        <span />
        {dates.map((date, column) => {
          const isToday = date === today;

          return (
            <button
              key={date}
              type="button"
              disabled={!plannedDates.includes(date) || readOnly}
              aria-label={`${copy.fillDay} ${messages.weekdays[column]}`}
              title={copy.fillDay}
              onClick={() => toggleAll(times.filter((time) => time >= "09:00").map((time) => cellKey(date, time)))}
              className={cn(
                "group flex flex-col items-center gap-0.5 py-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring enabled:hover:bg-muted/60",
                !plannedDates.includes(date) && "opacity-40",
              )}
            >
              <span className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                {messages.weekdays[column]}
              </span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {dateLabel.format(new Date(`${date}T00:00:00Z`))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex">
        {/* The only part of the grid that scrolls by touch, since cells paint when dragged. */}
        <div className="w-11 shrink-0 touch-pan-y">
          {times.map((time) => (
            <button
              key={time}
              type="button"
              disabled={readOnly}
              tabIndex={time.endsWith(":00") ? 0 : -1}
              aria-label={`${copy.fillTime} ${time}`}
              title={copy.fillTime}
              onClick={() => toggleAll(plannedDates.map((date) => cellKey(date, time)))}
              className="block h-7 w-full touch-pan-y pr-2 text-right text-[0.6875rem] leading-none text-muted-foreground tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring enabled:hover:text-foreground sm:h-6"
            >
              <span className="relative -top-1.5">{time.endsWith(":00") ? time : ""}</span>
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

              if (event.shiftKey && extendFromAnchor(cell.column, cell.row)) return;

              setAnchor(cell.key);
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
              if (!cell) return;
              setAnchor(cell.key);
              onPaint([cell.key], !mine.has(cell.key), mine);
            }}
            onKeyDown={(event) => {
              const cell = cellFrom(event.target);
              const move = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
              if (!cell || !move) return;

              event.preventDefault();
              const column = Math.min(6, Math.max(0, cell.column + move[0]));
              const row = Math.min(times.length - 1, Math.max(0, cell.row + move[1]));
              if (event.shiftKey) extendFromAnchor(column, row);
              setFocusable({ column, row });
              document.getElementById(`cell-${column}-${row}`)?.focus();
            }}
          >
            {dates.map((date, column) => {
              const planned = plannedDates.includes(date);
              const weekday = isoWeekday(date);

              return (
                <div key={date} role="row" className="min-w-0">
                  {times.map((time, row) => {
                    const key = cellKey(date, time);
                    const isMine = mine.has(key);

                    return (
                      <Cell
                        key={key}
                        id={`cell-${column}-${row}`}
                        column={column}
                        row={row}
                        label={`${messages.weekdays[column]} ${dateLabel.format(new Date(`${date}T00:00:00Z`))}, ${time}, ${counts.get(key) ?? 0} ${copy.outOf} ${people.length} ${copy.available}${isMine ? `, ${copy.you}` : ""}`}
                        isMine={isMine}
                        isAnchor={anchor === key && !readOnly}
                        isFocusable={column === focusable.column && row === focusable.row}
                        isHourStart={time.endsWith(":00")}
                        isWeekend={weekday >= 6}
                        isToday={date === today}
                        disabled={!planned || readOnly}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {lanes.flatMap(({ id, color, lane, bars }) =>
              bars.map(({ column, first, span, keys }) => {
                const isDimmed =
                  (highlightedPerson !== null && highlightedPerson !== id) ||
                  (highlight !== null && !keys.some((key) => highlight.has(key)));
                const dayWidth = `(100% / 7 - ${COLUMN_PADDING * 2}px)`;

                return (
                  <span
                    key={`${id}-${column}-${first}`}
                    style={{
                      backgroundColor: color,
                      left: `calc(${percent(column, 7)} + ${COLUMN_PADDING}px + ${dayWidth} * ${lane} / ${people.length})`,
                      width: `calc(${dayWidth} / ${people.length} - ${people.length > 1 ? LANE_GAP : 0}px)`,
                      top: `calc(${percent(first, times.length)} + 1px)`,
                      height: `calc(${percent(span, times.length)} - 2px)`,
                    }}
                    className={cn(
                      "absolute z-10 rounded-[5px] shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-[height,top,opacity] duration-150 ease-out",
                      isDimmed && "opacity-15",
                    )}
                  />
                );
              }),
            )}

            {matches.flatMap((match) =>
              matchRectangles(match, dates, times).map(({ column, first, span }) => (
                <span
                  key={`${match.startKey}-${match.participantIds.join()}-${column}-${first}-${span}`}
                  style={{
                    left: `calc(${percent(column, 7)} + 1px)`,
                    width: "calc(100% / 7 - 2px)",
                    top: percent(first, times.length),
                    height: percent(span, times.length),
                  }}
                  className={cn(
                    "absolute z-20 rounded-lg border-2 duration-300 animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none",
                    isFullMatch ? "border-foreground" : "border-dashed border-foreground/60",
                  )}
                />
              )),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
