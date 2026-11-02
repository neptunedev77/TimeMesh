"use client";

import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CloudOff, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { locale, messages } from "@/i18n";
import { type BestTime, bestTimes, type BoardMember, findMatches, memberColor } from "@/lib/availability/board";
import { slotTimes, weekDates } from "@/lib/availability/grid";
import { parseQuickInput, quickSelectionKeys } from "@/lib/availability/quick-input";
import { addDays } from "@/lib/availability/timezone";
import { cn } from "@/lib/utils";
import { BoardGrid } from "./board-grid";
import { MatchBanner } from "./match-banner";
import { QuickBar } from "./quick-bar";

const copy = messages.board;
const SAVE_DELAY = 500;
const REFRESH_INTERVAL = 5000;
const DAY_START = "07:00";
const UNDO_LIMIT = 30;

const shortDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
const formatShort = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));

export type BoardActions = {
  load: (week: string) => Promise<{ members: BoardMember[] } | { error: true }>;
  save: (week: string, cells: string[]) => Promise<{ ok: boolean }>;
};

type ProjectBoardProps = BoardActions & {
  memberId: string;
  initialWeek: string;
  initialMembers: BoardMember[];
  startDate: string;
  endDate: string;
  today: string;
  slotMinutes: number;
  timeZone: string;
  readOnly: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function firstOf(map: Map<string, string[]>) {
  return map.entries().next().value;
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export function ProjectBoard({
  load,
  save,
  memberId,
  initialWeek,
  initialMembers,
  startDate,
  endDate,
  today,
  slotMinutes,
  timeZone,
  readOnly,
}: ProjectBoardProps) {
  const [week, setWeek] = useState(initialWeek);
  const [members, setMembers] = useState(initialMembers);
  const [mine, setMine] = useState<ReadonlySet<string>>(
    () => new Set(initialMembers.find(({ id }) => id === memberId)?.cells),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [inspected, setInspected] = useState<string | null>(null);
  const [personHighlight, setPersonHighlight] = useState<string | null>(null);
  const [focusedTime, setFocusedTime] = useState<BestTime | null>(null);
  const [showEarly, setShowEarly] = useState(false);
  const [undoStack, setUndoStack] = useState<ReadonlySet<string>[]>([]);

  // What still has to reach the server, kept outside React state so saves never overlap.
  const pending = useRef(new Map<string, string[]>());
  const isSaving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retry = useRef<() => Promise<void>>(async () => {});
  const weekRef = useRef(week);
  const cache = useRef(new Map<string, BoardMember[]>([[initialWeek, initialMembers]]));

  const flush = useCallback(async () => {
    if (isSaving.current) return;
    isSaving.current = true;

    for (let job = firstOf(pending.current); job; job = firstOf(pending.current)) {
      const [jobWeek, cells] = job;
      pending.current.delete(jobWeek);
      setSaveState("saving");
      let ok = false;
      try {
        ({ ok } = await save(jobWeek, cells));
      } catch {
        ok = false;
      }
      if (!ok) {
        // A newer change to this week, made during the save, takes priority over the failed one.
        if (!pending.current.has(jobWeek)) pending.current.set(jobWeek, cells);
        setSaveState("error");
        isSaving.current = false;
        timer.current = setTimeout(() => void retry.current(), 4000);
        return;
      }
    }

    isSaving.current = false;
    setSaveState("saved");
  }, [save]);

  useEffect(() => {
    retry.current = flush;
  }, [flush]);

  const commit = useCallback(
    (next: ReadonlySet<string>) => {
      setMine(next);
      const cells = [...next];
      pending.current.set(weekRef.current, cells);
      const cached = cache.current.get(weekRef.current);
      if (cached) {
        cache.current.set(
          weekRef.current,
          cached.map((member) => (member.id === memberId ? { ...member, cells } : member)),
        );
      }
      setSaveState("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush, memberId],
  );

  const paint = useCallback(
    (keys: string[], add: boolean, base: ReadonlySet<string>) => {
      const next = new Set(base);
      keys.forEach((key) => (add ? next.add(key) : next.delete(key)));
      // A drag repaints from the same starting point, which only counts as one step to undo.
      setUndoStack((stack) => (stack.at(-1) === base ? stack : [...stack, base].slice(-UNDO_LIMIT)));
      commit(next);
    },
    [commit],
  );

  const undo = useCallback(() => {
    const previous = undoStack.at(-1);
    if (!previous) return;

    setUndoStack(undoStack.slice(0, -1));
    commit(previous);
  }, [commit, undoStack]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isTyping = (event.target as Element).closest?.("input, textarea");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey && !isTyping) {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current.size > 0 || isSaving.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Keeps everyone else's hours current. Your own stay as you left them on this screen.
  useEffect(() => {
    const refresh = async () => {
      if (document.hidden) return;
      const result = await load(week).catch(() => null);
      if (result && "members" in result && weekRef.current === week) {
        cache.current.set(week, result.members);
        setMembers(result.members);
      }
    };
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load, week]);

  async function goToWeek(next: string) {
    clearTimeout(timer.current);
    void flush();
    weekRef.current = next;
    setWeek(next);
    setFocusedTime(null);
    setInspected(null);
    setUndoStack([]);

    const cached = cache.current.get(next);
    if (cached) {
      setMembers(cached);
      setMine(new Set(cached.find(({ id }) => id === memberId)?.cells));
    } else {
      setIsLoading(true);
    }

    const result = await load(next).catch(() => null);
    if (result && "members" in result && weekRef.current === next) {
      cache.current.set(next, result.members);
      setMembers(result.members);
      // A change made while this was loading is newer than what the server sent.
      if (!pending.current.has(next) && !isSaving.current) {
        setMine(new Set(result.members.find(({ id }) => id === memberId)?.cells));
      }
    }
    if (weekRef.current === next) setIsLoading(false);
  }

  const dates = useMemo(() => weekDates(week), [week]);
  const plannedDates = useMemo(() => dates.filter((date) => date >= startDate && date <= endDate), [dates, startDate, endDate]);

  async function copyPreviousWeek() {
    const result = await load(addDays(week, -7)).catch(() => null);
    if (!result || !("members" in result)) return;

    const previous = result.members.find(({ id }) => id === memberId)?.cells ?? [];
    const keys = previous
      .map((key) => {
        const [date, time] = key.split("T");
        return `${addDays(date, 7)}T${time}`;
      })
      .filter((key) => plannedDates.includes(key.split("T")[0]));
    if (keys.length > 0) paint(keys, true, mine);
  }

  function applyQuickInput(text: string) {
    const selection = parseQuickInput(text, plannedDates, today);
    if (!selection) return false;

    const keys = quickSelectionKeys(selection, slotMinutes).filter((key) => plannedDates.includes(key.split("T")[0]));
    paint(keys, !selection.remove, mine);
    return true;
  }

  const hasPrevious = addDays(week, -1) >= startDate;
  const hasNext = addDays(week, 7) <= endDate;

  // Your hours come from this screen, so they count the moment you mark them.
  const liveMembers = useMemo(
    () => members.map((member) => (member.id === memberId ? { ...member, cells: [...mine] } : member)),
    [members, memberId, mine],
  );
  const gridPeople = useMemo(
    () => liveMembers.map(({ id, cells }, index) => ({ id, cells, color: memberColor(index) })),
    [liveMembers],
  );

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    liveMembers.forEach(({ cells }) => cells.forEach((key) => result.set(key, (result.get(key) ?? 0) + 1)));
    return result;
  }, [liveMembers]);

  const allTimes = useMemo(() => bestTimes(liveMembers, week, slotMinutes, 12), [liveMembers, week, slotMinutes]);
  const matchState = useMemo(() => findMatches(liveMembers, allTimes), [liveMembers, allTimes]);
  const matches = useMemo(() => ("matches" in matchState ? matchState.matches : []), [matchState]);
  const options = useMemo(
    () =>
      allTimes
        .filter(({ participantIds }) => participantIds.length >= 2)
        .filter((time) => time !== matches[0])
        .slice(0, 5),
    [allTimes, matches],
  );

  const hasEarlyHours = useMemo(() => [...counts.keys()].some((key) => key.split("T")[1] < DAY_START), [counts]);
  const isEarlyVisible = showEarly || hasEarlyHours;
  const times = useMemo(
    () => slotTimes(slotMinutes).filter((time) => isEarlyVisible || time >= DAY_START),
    [slotMinutes, isEarlyVisible],
  );

  const highlight = useMemo(() => (focusedTime ? new Set(focusedTime.keys) : null), [focusedTime]);

  const nameOf = (id: string) => (id === memberId ? copy.you : (members.find((member) => member.id === id)?.name ?? ""));
  const inspectedMembers = inspected ? liveMembers.filter(({ cells }) => cells.includes(inspected)) : [];
  const inspectedOthers = inspected ? liveMembers.filter(({ cells }) => !cells.includes(inspected)) : [];

  return (
    <div className="flex flex-col gap-4">
      <MatchBanner
        state={matchState}
        options={options}
        people={liveMembers}
        slotMinutes={slotMinutes}
        onFocusTime={setFocusedTime}
      />

      {readOnly ? (
        <p className="rounded-lg bg-muted p-3 text-sm">{copy.readOnly}</p>
      ) : (
        <QuickBar
          canCopy={hasPrevious && mine.size === 0}
          canUndo={undoStack.length > 0}
          canClear={mine.size > 0}
          onApply={applyQuickInput}
          onCopyPrevious={() => void copyPreviousWeek()}
          onUndo={undo}
          onClear={() => paint([...mine], false, mine)}
        />
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={copy.previousWeek}
                disabled={!hasPrevious}
                onClick={() => void goToWeek(addDays(week, -7))}
                className="flex size-8 items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <p key={week} className="min-w-28 text-center text-sm font-medium animate-in fade-in-0 duration-300">
                {formatShort(week)} – {formatShort(addDays(week, 6))}
              </p>
              <button
                type="button"
                aria-label={copy.nextWeek}
                disabled={!hasNext}
                onClick={() => void goToWeek(addDays(week, 7))}
                className="flex size-8 items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
              {!hasEarlyHours && (
                <button
                  type="button"
                  onClick={() => setShowEarly((value) => !value)}
                  className="ml-1 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showEarly ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronUp className="size-3.5" aria-hidden="true" />}
                  {showEarly ? copy.hideEarly : copy.showEarly}
                </button>
              )}
            </div>
            <p aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
              {saveState === "saving" && (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                  {copy.saving}
                </>
              )}
              {saveState === "saved" && (
                <span className="flex items-center gap-1.5 animate-in fade-in-0 duration-300">
                  <Check className="size-3.5 text-primary" aria-hidden="true" />
                  {copy.saved}
                </span>
              )}
              {saveState === "error" && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <CloudOff className="size-3.5" aria-hidden="true" />
                  {copy.saveFailed}
                </span>
              )}
            </p>
          </div>

          <div className={cn("transition-opacity duration-200", isLoading && "opacity-50")}>
            <BoardGrid
              key={week}
              dates={dates}
              plannedDates={plannedDates}
              times={times}
              today={today}
              people={gridPeople}
              counts={counts}
              mine={mine}
              matches={matches}
              isFullMatch={matchState.kind === "everyone"}
              highlight={highlight}
              highlightedPerson={personHighlight}
              readOnly={readOnly || isLoading}
              onPaint={paint}
              onInspect={setInspected}
            />
          </div>

          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {!readOnly && <p>{copy.hint}</p>}
            <p>
              {copy.timeZone} {timeZone}
            </p>
          </div>
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:pt-10">
          <section className="rounded-2xl border bg-card p-3 shadow-xs">
            <h2 className="px-1 text-xs font-medium text-muted-foreground">{copy.people}</h2>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {liveMembers.map(({ id, name, cells }, index) => {
                const isAvailableNow = inspected !== null && cells.includes(inspected);

                return (
                  <li key={id}>
                    <button
                      type="button"
                      onMouseEnter={() => setPersonHighlight(id)}
                      onMouseLeave={() => setPersonHighlight(null)}
                      onFocus={() => setPersonHighlight(id)}
                      onBlur={() => setPersonHighlight(null)}
                      onClick={() => setPersonHighlight((current) => (current === id ? null : id))}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg p-1 text-left text-sm transition-[background-color,opacity] duration-150 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                        inspected !== null && !isAvailableNow && "opacity-35",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: memberColor(index) }}
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold text-white transition-opacity duration-300",
                          cells.length === 0 && "opacity-35",
                        )}
                      >
                        {initials(name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{id === memberId ? `${name} (${copy.you.toLowerCase()})` : name}</span>
                      {cells.length === 0 && <span className="sr-only">{copy.noTimes}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="min-h-16 rounded-2xl border bg-card p-3 text-sm shadow-xs" aria-live="off">
            {inspected ? (
              <>
                <p className="font-medium tabular-nums">
                  {messages.weekdays[dates.indexOf(inspected.split("T")[0])]} {formatShort(inspected.split("T")[0])}, {inspected.split("T")[1]}
                </p>
                <p className="mt-1 text-muted-foreground wrap-break-word">
                  {inspectedMembers.length === 0
                    ? copy.nobody
                    : `${inspectedMembers.length} ${copy.outOf} ${members.length}: ${inspectedMembers.map(({ id }) => nameOf(id)).join(", ")}`}
                </p>
                {inspectedOthers.length > 0 && inspectedMembers.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground wrap-break-word">
                    {copy.unavailable}: {inspectedOthers.map(({ id }) => nameOf(id)).join(", ")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">{copy.inspectHint}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
