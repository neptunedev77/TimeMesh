"use client";

import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CloudOff, Copy, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { locale, messages } from "@/i18n";
import {
  type BestTime,
  bestTimes,
  type BoardMember,
  findMatches,
  laneBackground,
  memberColor,
} from "@/lib/availability/board";
import { slotTimes, weekDates } from "@/lib/availability/grid";
import { addDays } from "@/lib/availability/timezone";
import { cn } from "@/lib/utils";
import { BoardGrid } from "./board-grid";
import { MatchBanner } from "./match-banner";

const copy = messages.board;
const SAVE_DELAY = 500;
const REFRESH_INTERVAL = 5000;
const DAY_START = "07:00";

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

function describeBest({ startKey, endKey }: BestTime) {
  const [date, start] = startKey.split("T");
  const [, end] = endKey.split("T");
  const weekday = messages.weekdays[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];

  return { day: `${weekday} ${formatShort(date)}`, hours: `${start}–${end}` };
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
  const [bestHighlight, setBestHighlight] = useState<number | null>(null);
  const [showEarly, setShowEarly] = useState(false);

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

  const paint = useCallback(
    (keys: string[], add: boolean, base: ReadonlySet<string>) => {
      const next = new Set(base);
      keys.forEach((key) => (add ? next.add(key) : next.delete(key)));
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
    setBestHighlight(null);
    setInspected(null);

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

  const hasPrevious = addDays(week, -1) >= startDate;
  const hasNext = addDays(week, 7) <= endDate;

  // Your hours come from this screen, so they count the moment you mark them.
  const liveMembers = useMemo(
    () => members.map((member) => (member.id === memberId ? { ...member, cells: [...mine] } : member)),
    [members, memberId, mine],
  );

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    liveMembers.forEach(({ cells }) => cells.forEach((key) => result.set(key, (result.get(key) ?? 0) + 1)));
    return result;
  }, [liveMembers]);

  const backgrounds = useMemo(() => {
    const lanes = new Map<string, number[]>();
    liveMembers.forEach(({ cells }, index) =>
      cells.forEach((key) => lanes.set(key, [...(lanes.get(key) ?? []), index])),
    );
    return new Map([...lanes].map(([key, indexes]) => [key, laneBackground(indexes, liveMembers.length) ?? ""]));
  }, [liveMembers]);

  const allTimes = useMemo(() => bestTimes(liveMembers, week, slotMinutes, 12), [liveMembers, week, slotMinutes]);
  const matchState = useMemo(() => findMatches(liveMembers, allTimes), [liveMembers, allTimes]);
  const matches = useMemo(() => ("matches" in matchState ? matchState.matches : []), [matchState]);
  const best = useMemo(
    () =>
      allTimes
        .filter(({ participantIds }) => participantIds.length >= 2)
        .filter((time) => !matches.includes(time))
        .slice(0, 4),
    [allTimes, matches],
  );

  const hasEarlyHours = useMemo(() => [...mine, ...counts.keys()].some((key) => key.split("T")[1] < DAY_START), [mine, counts]);
  const isEarlyVisible = showEarly || hasEarlyHours;
  const times = useMemo(
    () => slotTimes(slotMinutes).filter((time) => isEarlyVisible || time >= DAY_START),
    [slotMinutes, isEarlyVisible],
  );

  const highlight = useMemo(() => {
    if (bestHighlight !== null && best[bestHighlight]) return new Set(best[bestHighlight].keys);
    const person = liveMembers.find(({ id }) => id === personHighlight);
    return person ? new Set(person.cells) : null;
  }, [best, bestHighlight, liveMembers, personHighlight]);

  const nameOf = (id: string) => (id === memberId ? copy.you : (members.find((member) => member.id === id)?.name ?? ""));
  const inspectedMembers = inspected
    ? liveMembers.filter(({ cells }) => cells.includes(inspected))
    : [];
  const inspectedOthers = inspected
    ? liveMembers.filter(({ cells }) => !cells.includes(inspected))
    : [];

  return (
    <div className="flex flex-col gap-5">
      <MatchBanner state={matchState} people={liveMembers} describe={describeBest} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={copy.previousWeek}
              disabled={!hasPrevious}
              onClick={() => void goToWeek(addDays(week, -7))}
              className="flex size-9 items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <p key={week} className="min-w-32 text-center text-sm font-medium animate-in fade-in-0 duration-300 sm:text-base">
              {formatShort(week)} – {formatShort(addDays(week, 6))}
            </p>
            <button
              type="button"
              aria-label={copy.nextWeek}
              disabled={!hasNext}
              onClick={() => void goToWeek(addDays(week, 7))}
              className="flex size-9 items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
          {!readOnly && hasPrevious && mine.size === 0 && (
            <button
              type="button"
              onClick={() => void copyPreviousWeek()}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Copy className="size-3.5" aria-hidden="true" />
              {copy.copyPrevious}
            </button>
          )}
          <p aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">
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

        {readOnly ? (
          <p className="rounded-lg bg-muted p-3 text-sm">{copy.readOnly}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{copy.hint}</p>
        )}

        <div className={cn("transition-opacity duration-200", isLoading && "opacity-50")}>
          {!hasEarlyHours && (
            <button
              type="button"
              onClick={() => setShowEarly((value) => !value)}
              className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showEarly ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronUp className="size-3.5" aria-hidden="true" />}
              {showEarly ? copy.hideEarly : copy.showEarly}
            </button>
          )}
          <BoardGrid
            dates={dates}
            plannedDates={plannedDates}
            times={times}
            today={today}
            slotMinutes={slotMinutes}
            total={members.length}
            counts={counts}
            backgrounds={backgrounds}
            mine={mine}
            myColor={memberColor(Math.max(0, members.findIndex(({ id }) => id === memberId)))}
            matches={matches}
            isFullMatch={matchState.kind === "everyone"}
            highlight={highlight}
            readOnly={readOnly || isLoading}
            onPaint={paint}
            onInspect={setInspected}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {copy.timeZone} {timeZone}
        </p>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
        <section className="min-h-28 rounded-2xl border bg-card p-4 shadow-xs">
          {inspected ? (
            <div className="animate-in fade-in-0 duration-150">
              <p className="text-sm font-medium">
                {messages.weekdays[dates.indexOf(inspected.split("T")[0])]} {formatShort(inspected.split("T")[0])}, {inspected.split("T")[1]}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {inspectedMembers.length} {copy.outOf} {members.length}
                </span>
              </p>
              {inspectedMembers.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{copy.nobody}</p>
              ) : (
                <p className="mt-2 text-sm wrap-break-word">
                  <span className="text-muted-foreground">{copy.canAttend}: </span>
                  {inspectedMembers.map(({ id }) => nameOf(id)).join(", ")}
                </p>
              )}
              {inspectedOthers.length > 0 && inspectedMembers.length > 0 && (
                <p className="mt-1 text-sm wrap-break-word">
                  <span className="text-muted-foreground">{copy.unavailable}: </span>
                  {inspectedOthers.map(({ id }) => nameOf(id)).join(", ")}
                </p>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-sm font-medium">{copy.people}</h2>
              <ul className="mt-2 flex flex-col gap-0.5">
                {liveMembers.map(({ id, name, cells }, index) => (
                  <li key={id}>
                    <button
                      type="button"
                      onMouseEnter={() => setPersonHighlight(id)}
                      onMouseLeave={() => setPersonHighlight(null)}
                      onFocus={() => setPersonHighlight(id)}
                      onBlur={() => setPersonHighlight(null)}
                      onClick={() => setPersonHighlight((current) => (current === id ? null : id))}
                      className="flex w-full items-center gap-2 rounded-lg p-1 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: memberColor(index) }}
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white transition-opacity duration-300",
                          cells.length === 0 && "opacity-35",
                        )}
                      >
                        {initials(name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{id === memberId ? `${name} (${copy.you.toLowerCase()})` : name}</span>
                      {cells.length === 0 && <span className="sr-only">{copy.noTimes}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {best.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-xs">
          <h2 className="text-sm font-medium">{copy.best}</h2>
            <ol className="mt-2 flex flex-col gap-1">
              {best.map((time, index) => {
                const { day, hours } = describeBest(time);
                const isEveryone = time.participantIds.length === members.length && members.length > 1;

                return (
                  <li key={`${time.startKey}-${time.participantIds.join()}`} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
                    <button
                      type="button"
                      onMouseEnter={() => setBestHighlight(index)}
                      onMouseLeave={() => setBestHighlight(null)}
                      onFocus={() => setBestHighlight(index)}
                      onBlur={() => setBestHighlight(null)}
                      onClick={() => setBestHighlight((current) => (current === index ? null : index))}
                      className="w-full rounded-lg p-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium">{day}</span>
                        <span className="shrink-0 text-muted-foreground tabular-nums">{hours}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {isEveryone ? copy.everyone : time.participantIds.map(nameOf).join(", ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
        </section>
        )}
      </aside>
      </div>
    </div>
  );
}