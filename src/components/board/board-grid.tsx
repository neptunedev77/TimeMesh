"use client";

import { memo, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { locale, messages } from "@/i18n";
import { type BestTime, dayBars, heatBlocks } from "@/lib/availability/board";
import { cellKey, nextCellKey } from "@/lib/availability/grid";
import { isoWeekday } from "@/lib/availability/timezone";
import { cn } from "@/lib/utils";

const copy = messages.board;
const dateLabel = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" });
const COLUMN_PADDING = 3;
const BLOCK_RADIUS = 6;
const HEAT_FROM_PEOPLE = 5;
const MAX_NAMES_IN_COLUMN = 2;

const weekdayOf = (date: string) => messages.weekdays[isoWeekday(date) - 1];

export type GridPerson = {
  id: string;
  name: string;
  color: string;
  cells: readonly string[];
};

type GridProps = {
  dates: string[];
  plannedDates: readonly string[];
  times: string[];
  today: string;
  slotMinutes: number;
  /** Who is shown, which can be fewer than the group in "only mine". */
  people: GridPerson[];
  total: number;
  counts: ReadonlyMap<string, number>;
  mine: ReadonlySet<string>;
  matches: BestTime[];
  isFullMatch: boolean;
  highlight: ReadonlySet<string> | null;
  highlightedPerson: string | null;
  inspected: string | null;
  nowKey: string | null;
  nowMinutes: number | null;
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
  isPast: boolean;
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
  isPast,
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
        isPast && "bg-muted/60",
        !disabled && "hover:bg-foreground/[0.06]",
        isAnchor && "ring-2 ring-foreground/30 ring-inset",
      )}
    />
  );
});

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
  slotMinutes,
  people,
  total,
  counts,
  mine,
  matches,
  isFullMatch,
  highlight,
  highlightedPerson,
  inspected,
  nowKey,
  nowMinutes,
  readOnly,
  onPaint,
  onInspect,
}: GridProps) {
  const drag = useRef<{ column: number; row: number; add: boolean; base: ReadonlySet<string> } | null>(null);
  const lastCell = useRef<{ column: number; row: number } | null>(null);
  const handledByPointer = useRef(false);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [dragTip, setDragTip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [focusable, setFocusable] = useState({
    column: Math.max(0, dates.findIndex((date) => plannedDates.includes(date))),
    row: 0,
  });

  const columns = dates.length;
  const isSingleDay = columns === 1;
  const isHeatMode = people.length >= HEAT_FROM_PEOPLE && highlightedPerson === null;
  // In heat mode, pointing at someone in the list shows just their bars.
  const barPeople = useMemo(
    () =>
      people.length >= HEAT_FROM_PEOPLE && highlightedPerson !== null
        ? people.filter(({ id }) => id === highlightedPerson)
        : people,
    [people, highlightedPerson],
  );
  const bars = useMemo(
    () => (isHeatMode ? [] : dayBars(barPeople, dates, times)),
    [isHeatMode, barPeople, dates, times],
  );
  const blocks = useMemo(
    () => (isHeatMode ? heatBlocks(people, mine, dates, times) : []),
    [isHeatMode, people, mine, dates, times],
  );

  useEffect(() => {
    const stop = () => {
      drag.current = null;
      setDragTip(null);
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const isPast = (key: string) => nowKey !== null && key < nowKey;
  const hoverRow = inspected ? times.indexOf(inspected.split("T")[1]) : -1;
  const hoverColumn = inspected ? dates.indexOf(inspected.split("T")[0]) : -1;

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

  function dragLabel(column: number, row: number) {
    if (!drag.current) return "";

    const firstColumn = Math.min(drag.current.column, column);
    const lastColumn = Math.max(drag.current.column, column);
    const firstRow = Math.min(drag.current.row, row);
    const lastRow = Math.max(drag.current.row, row);
    const days =
      firstColumn === lastColumn
        ? weekdayOf(dates[firstColumn])
        : `${weekdayOf(dates[firstColumn])}–${weekdayOf(dates[lastColumn])}`;
    const end = nextCellKey(cellKey(dates[0], times[lastRow]), slotMinutes).split("T")[1];

    return `${days} ${times[firstRow]}–${end}`;
  }

  function showDragTip(event: PointerEvent, column: number, row: number) {
    setDragTip({ x: event.clientX, y: event.clientY, label: dragLabel(column, row) });
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

  function toggleAll(keys: string[]) {
    const editable = keys.filter((key) => !isPast(key));
    onPaint(editable, !(editable.length > 0 && editable.every((key) => mine.has(key))), mine);
  }

  const percent = (value: number, of: number) => `${(value / of) * 100}%`;
  const dayWidth = `(100% / ${columns} - ${COLUMN_PADDING * 2}px)`;

  const todayColumn = dates.indexOf(today);
  const firstMinutes = times[0] ? Number(times[0].slice(0, 2)) * 60 + Number(times[0].slice(3)) : 0;
  const nowOffset = nowMinutes === null ? -1 : (nowMinutes - firstMinutes) / (times.length * slotMinutes);
  const showNowLine = todayColumn >= 0 && nowOffset >= 0 && nowOffset <= 1;

  return (
    <div className="overflow-clip rounded-2xl border bg-card shadow-xs">
      {dragTip && (
        <div
          aria-hidden="true"
          style={{ left: dragTip.x, top: dragTip.y - 44 }}
          className="pointer-events-none fixed z-50 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-background tabular-nums shadow-lg"
        >
          {dragTip.label}
        </div>
      )}

      <div
        style={{ gridTemplateColumns: `2.75rem repeat(${columns}, minmax(0, 1fr))` }}
        className={cn("sticky top-0 z-40 grid border-b bg-card/95 backdrop-blur-sm", isSingleDay && "pr-14")}
      >
        <span />
        {dates.map((date, column) => (
          <button
            key={date}
            type="button"
            disabled={!plannedDates.includes(date) || readOnly}
            aria-label={`${copy.fillDay} ${weekdayOf(date)}`}
            title={copy.fillDay}
            onClick={() => toggleAll(times.filter((time) => time >= "09:00").map((time) => cellKey(date, time)))}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring enabled:hover:bg-muted/60",
              !plannedDates.includes(date) && "opacity-40",
              hoverColumn === column && "bg-muted/60",
            )}
          >
            <span className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
              {weekdayOf(date)}
            </span>
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums",
                date === today && "bg-primary text-primary-foreground",
              )}
            >
              {dateLabel.format(new Date(`${date}T00:00:00Z`))}
            </span>
          </button>
        ))}
      </div>

      <div className="flex">
        {/* Along with the strip in single-day view, this scrolls by touch, since cells paint when dragged. */}
        <div className="w-11 shrink-0 touch-pan-y">
          {times.map((time, row) => (
            <button
              key={time}
              type="button"
              disabled={readOnly}
              tabIndex={time.endsWith(":00") ? 0 : -1}
              aria-label={`${copy.fillTime} ${time}`}
              title={copy.fillTime}
              onClick={() => toggleAll(plannedDates.filter((date) => dates.includes(date)).map((date) => cellKey(date, time)))}
              className={cn(
                "block h-7 w-full touch-pan-y pr-2 text-right text-[0.6875rem] leading-none text-muted-foreground tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring enabled:hover:text-foreground sm:h-6",
                hoverRow === row && "font-semibold text-foreground",
              )}
            >
              <span className="relative -top-1.5">
                {time.endsWith(":00") || hoverRow === row ? time : ""}
              </span>
            </button>
          ))}
        </div>

        <div className={cn("relative flex-1", isSingleDay && "pr-14")}>
          <div
            role="grid"
            aria-label={copy.gridLabel}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            className="grid select-none"
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
              lastCell.current = { column: cell.column, row: cell.row };
              onPaint([cell.key], add, mine);
              showDragTip(event, cell.column, cell.row);
            }}
            onPointerOver={(event) => {
              const cell = cellFrom(event.target);
              if (!cell) return;
              onInspect(cell.key);
              if (drag.current) {
                const { column, row, add, base } = drag.current;
                lastCell.current = { column: cell.column, row: cell.row };
                onPaint(rectangle(column, row, cell.column, cell.row), add, base);
              }
            }}
            onPointerMove={(event) => {
              if (drag.current && lastCell.current) {
                showDragTip(event, lastCell.current.column, lastCell.current.row);
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
              const column = Math.min(columns - 1, Math.max(0, cell.column + move[0]));
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
                    const past = isPast(key);

                    return (
                      <Cell
                        key={key}
                        id={`cell-${column}-${row}`}
                        column={column}
                        row={row}
                        label={`${weekdayOf(date)} ${dateLabel.format(new Date(`${date}T00:00:00Z`))}, ${time}, ${counts.get(key) ?? 0} ${copy.outOf} ${total} ${copy.available}${isMine ? `, ${copy.you}` : ""}`}
                        isMine={isMine}
                        isAnchor={anchor === key && !readOnly && !counts.get(key)}
                        isFocusable={column === focusable.column && row === focusable.row}
                        isHourStart={time.endsWith(":00")}
                        isWeekend={weekday >= 6}
                        isToday={date === today}
                        isPast={past}
                        disabled={!planned || readOnly || past}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className={cn("pointer-events-none absolute inset-y-0 left-0 overflow-hidden", isSingleDay ? "right-14" : "right-0")} aria-hidden="true">
            {hoverRow >= 0 && (
              <span
                style={{ top: percent(hoverRow, times.length), height: percent(1, times.length) }}
                className="absolute inset-x-0 bg-foreground/[0.04]"
              />
            )}
            {hoverColumn >= 0 && (
              <span
                style={{ left: percent(hoverColumn, columns), width: percent(1, columns) }}
                className="absolute inset-y-0 bg-foreground/[0.04]"
              />
            )}

            {bars.map(({ memberIndex, column, first, span, position, count, keys, joinsAbove, startsBlock, endsBlock }) => {
              const { id, name, color } = barPeople[memberIndex];
              const isDimmed =
                (highlightedPerson !== null && highlightedPerson !== id) ||
                (highlight !== null && !keys.some((key) => highlight.has(key)));
              const isGone = isPast(keys[keys.length - 1]);
              const shortName = name.trim().charAt(0).toUpperCase();

              return (
                <span
                  key={`${id}-${column}-${first}`}
                  style={{
                    backgroundColor: color,
                    left: `calc(${percent(column, columns)} + ${COLUMN_PADDING}px + ${dayWidth} * ${position} / ${count})`,
                    width: `calc(${dayWidth} / ${count})`,
                    top: `calc(${percent(first, times.length)} + ${startsBlock ? 1 : 0}px)`,
                    height: `calc(${percent(span, times.length)} - ${(startsBlock ? 1 : 0) + (endsBlock ? 1 : 0)}px)`,
                    // Only the outer corners of a block are rounded, so it reads as one shape.
                    borderTopLeftRadius: startsBlock && position === 0 ? BLOCK_RADIUS : 0,
                    borderTopRightRadius: startsBlock && position === count - 1 ? BLOCK_RADIUS : 0,
                    borderBottomLeftRadius: endsBlock && position === 0 ? BLOCK_RADIUS : 0,
                    borderBottomRightRadius: endsBlock && position === count - 1 ? BLOCK_RADIUS : 0,
                    boxShadow: position > 0 ? "inset 1px 0 0 var(--card)" : undefined,
                  }}
                  className={cn(
                    "absolute z-10 overflow-hidden px-1 py-0.5 text-[0.625rem] leading-tight font-semibold text-white transition-[opacity] duration-150 ease-out",
                    isGone && "opacity-40",
                    isDimmed && "opacity-15",
                  )}
                >
                  {!joinsAbove && (
                    isSingleDay || count <= MAX_NAMES_IN_COLUMN ? (
                      <>
                        <span className={cn("block truncate", !isSingleDay && "max-sm:hidden")}>{name}</span>
                        {!isSingleDay && <span className="sm:hidden">{shortName}</span>}
                      </>
                    ) : (
                      shortName
                    )
                  )}
                </span>
              );
            })}

            {blocks.map(({ column, first, span, count, isMine, keys }) => {
              const share = count / total;
              const isDimmed = highlight !== null && !keys.some((key) => highlight.has(key));

              return (
                <span
                  key={`${column}-${first}`}
                  style={{
                    backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(15 + share * 85)}%, transparent)`,
                    left: `calc(${percent(column, columns)} + ${COLUMN_PADDING}px)`,
                    width: `calc(${dayWidth})`,
                    top: `calc(${percent(first, times.length)} + 1px)`,
                    height: `calc(${percent(span, times.length)} - 2px)`,
                  }}
                  className={cn(
                    "absolute z-10 flex items-center justify-center rounded-[5px] text-[0.625rem] font-semibold tabular-nums transition-[height,top,opacity,background-color] duration-150 ease-out",
                    share > 0.55 ? "text-primary-foreground" : "text-foreground",
                    isMine && "shadow-[inset_0_0_0_2px_var(--foreground)]",
                    isPast(keys[keys.length - 1]) && "opacity-40",
                    isDimmed && "opacity-15",
                  )}
                >
                  {count}/{total}
                </span>
              );
            })}

            {matches.flatMap((match) =>
              matchRectangles(match, dates, times).map(({ column, first, span }) => (
                <span
                  key={`${match.startKey}-${match.participantIds.join()}-${column}-${first}-${span}`}
                  style={{
                    left: `calc(${percent(column, columns)} + 1px)`,
                    width: `calc(100% / ${columns} - 2px)`,
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

            {showNowLine && (
              <span
                style={{
                  top: `${nowOffset * 100}%`,
                  left: percent(todayColumn, columns),
                  width: percent(1, columns),
                }}
                className="absolute z-30 h-0.5 bg-destructive"
              >
                <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-destructive" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
