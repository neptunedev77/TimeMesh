"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { locale, messages } from "@/i18n";
import { type BestTime, type MatchState, memberColor } from "@/lib/availability/board";
import { cn } from "@/lib/utils";

const copy = messages.board.banner;
const { weekdays } = messages;
const VISIBLE_OPTIONS = 4;

const longDate = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dayNumber = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" });
const nameList = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });

type Person = { id: string; name: string; cells: string[] };

type MatchBannerProps = {
  state: MatchState;
  options: BestTime[];
  people: Person[];
  slotMinutes: number;
  nameOf: (id: string) => string;
  onFocusTime: (time: BestTime | null) => void;
};

const parseDate = (key: string) => new Date(`${key.split("T")[0]}T00:00:00Z`);
const hoursOf = ({ startKey, endKey }: BestTime) => `${startKey.split("T")[1]}–${endKey.split("T")[1]}`;
const weekdayOf = (key: string) => weekdays[(parseDate(key).getUTCDay() + 6) % 7];

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours > 0 ? `${hours} h` : "", rest > 0 ? `${rest} min` : ""].filter(Boolean).join(" ");
}

function Avatars({ ids, people }: { ids: string[]; people: Person[] }) {
  return (
    <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
      {ids.map((id) => {
        const index = people.findIndex((person) => person.id === id);

        return (
          <span
            key={id}
            style={{ backgroundColor: memberColor(index) }}
            className="flex size-7 items-center justify-center rounded-full text-[0.6875rem] font-semibold text-white ring-2 ring-card"
          >
            {people[index]?.name.trim().charAt(0).toUpperCase()}
          </span>
        );
      })}
    </span>
  );
}

/** The headline of the board: the time that suits everyone, then the others by how many can attend. */
export function MatchBanner({ state, options, people, slotMinutes, nameOf, onFocusTime }: MatchBannerProps) {
  const [showAll, setShowAll] = useState(false);
  const [showOnPhone, setShowOnPhone] = useState(false);
  const responded = people.filter(({ cells }) => cells.length > 0).length;

  if (state.kind === "waiting" || state.kind === "none") {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:px-5">
        <div className="min-w-0">
          <p className="font-medium">{state.kind === "waiting" ? copy.waitingTitle : copy.noneTitle}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {state.kind === "waiting" ? copy.waitingDescription : copy.noneDescription}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1" aria-hidden="true">
            {people.map(({ id, cells }, index) => (
              <span
                key={id}
                style={{ backgroundColor: cells.length > 0 ? memberColor(index) : undefined }}
                className={cn("size-2 rounded-full transition-colors duration-300", cells.length === 0 && "bg-border")}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {responded} {messages.board.outOf} {people.length} {copy.responded}
          </span>
        </div>
      </section>
    );
  }

  const [best] = state.matches;
  const isEveryone = state.kind === "everyone";
  const namesOf = (ids: string[]) => nameList.format(ids.map(nameOf));
  const missingFrom = (ids: string[]) => people.map(({ id }) => id).filter((id) => !ids.includes(id));
  const bestMissing = missingFrom(best.participantIds);
  const visibleOptions = showAll ? options : options.slice(0, VISIBLE_OPTIONS);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <button
        key={best.startKey + best.participantIds.join()}
        type="button"
        onMouseEnter={() => onFocusTime(best)}
        onMouseLeave={() => onFocusTime(null)}
        onFocus={() => onFocusTime(best)}
        onBlur={() => onFocusTime(null)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 p-3 text-left duration-500 outline-none animate-in fade-in-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:animate-none sm:gap-5 sm:p-5"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex w-14 shrink-0 flex-col overflow-hidden rounded-xl border text-center",
            isEveryone && "border-primary",
          )}
        >
          <span
            className={cn(
              "py-0.5 text-[0.625rem] font-semibold tracking-widest uppercase",
              isEveryone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {weekdayOf(best.startKey)}
          </span>
          <span className="py-1 text-2xl leading-tight font-semibold tabular-nums">
            {dayNumber.format(parseDate(best.startKey))}
          </span>
        </span>

        <span className="min-w-0 flex-1 basis-48">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", isEveryone ? "bg-primary" : "bg-muted-foreground")} />
            {isEveryone ? copy.everyoneTitle : copy.noEveryoneTitle}
          </span>
          <span className="mt-0.5 block text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {hoursOf(best)}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground first-letter:uppercase max-sm:hidden">
            {longDate.format(parseDate(best.startKey))} · {formatDuration(best.keys.length * slotMinutes)}
          </span>
        </span>

        <span className="flex max-w-full flex-col items-start gap-1 sm:max-w-64 sm:items-end sm:text-right">
          <span className="max-sm:hidden">
            <Avatars ids={best.participantIds} people={people} />
          </span>
          <span className="text-sm wrap-break-word">
            {best.participantIds.length} {messages.board.outOf} {people.length}: {namesOf(best.participantIds)}
          </span>
          {bestMissing.length > 0 && (
            <span className="text-xs text-muted-foreground wrap-break-word">
              {bestMissing.length === 1 ? copy.cannot : copy.cannotPlural}: {namesOf(bestMissing)}
            </span>
          )}
        </span>
      </button>

      {options.length > 0 && (
        <button
          type="button"
          aria-expanded={showOnPhone}
          onClick={() => setShowOnPhone((value) => !value)}
          className="flex w-full items-center justify-between border-t bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:hidden"
        >
          {copy.showOptions} ({options.length})
          <ChevronDown className={cn("size-3.5 transition-transform", showOnPhone && "rotate-180")} aria-hidden="true" />
        </button>
      )}
      {options.length > 0 && (
        <div className={cn("border-t bg-muted/30 px-2 py-2 sm:block sm:px-3", !showOnPhone && "hidden")}>
          <h3 className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">{copy.alternatives}</h3>
          <ol className="flex flex-col">
            {visibleOptions.map((time) => {
              const missing = missingFrom(time.participantIds);

              return (
                <li key={time.startKey + time.participantIds.join()}>
                  <button
                    type="button"
                    onMouseEnter={() => onFocusTime(time)}
                    onMouseLeave={() => onFocusTime(null)}
                    onFocus={() => onFocusTime(time)}
                    onBlur={() => onFocusTime(null)}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[3rem_minmax(0,1fr)_auto]"
                  >
                    <span className="row-span-2 rounded-md bg-muted px-1.5 py-1 text-center text-xs font-semibold tabular-nums sm:row-span-1">
                      {time.participantIds.length}/{people.length}
                    </span>
                    <span className="min-w-0 text-sm font-medium wrap-break-word">
                      {namesOf(time.participantIds)}
                      {missing.length > 0 && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {missing.length === 1 ? copy.cannot : copy.cannotPlural}: {namesOf(missing)}
                        </span>
                      )}
                    </span>
                    <span className="col-start-2 text-sm tabular-nums sm:col-start-auto sm:text-right">
                      <span className="font-medium">
                        {weekdayOf(time.startKey)} {dayNumber.format(parseDate(time.startKey))}
                      </span>
                      <span className="ml-1.5 text-muted-foreground">{hoursOf(time)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {options.length > VISIBLE_OPTIONS && (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="mt-0.5 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", showAll && "rotate-180")} aria-hidden="true" />
              {showAll ? copy.showFewer : `${copy.showMore} (${options.length - VISIBLE_OPTIONS})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
