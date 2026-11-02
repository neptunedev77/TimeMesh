"use client";

import { locale, messages } from "@/i18n";
import { type BestTime, type MatchState, memberColor } from "@/lib/availability/board";
import { cn } from "@/lib/utils";

const copy = messages.board.banner;
const { weekdays } = messages;

const longDate = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dayNumber = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" });

type Person = { id: string; name: string; cells: string[] };

type MatchBannerProps = {
  state: MatchState;
  options: BestTime[];
  people: Person[];
  slotMinutes: number;
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
    <div className="flex -space-x-1.5" aria-hidden="true">
      {ids.map((id) => {
        const index = people.findIndex((person) => person.id === id);

        return (
          <span
            key={id}
            title={people[index]?.name}
            style={{ backgroundColor: memberColor(index) }}
            className="flex size-7 items-center justify-center rounded-full text-[0.6875rem] font-semibold text-white ring-2 ring-card"
          >
            {people[index]?.name.trim().charAt(0).toUpperCase()}
          </span>
        );
      })}
    </div>
  );
}

/** The headline of the board: the best time the group has, shown like a calendar entry. */
export function MatchBanner({ state, options, people, slotMinutes, onFocusTime }: MatchBannerProps) {
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
  const names = best.participantIds.map((id) => people.find((person) => person.id === id)?.name).join(", ");

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <button
        key={best.startKey + best.participantIds.join()}
        type="button"
        onMouseEnter={() => onFocusTime(best)}
        onMouseLeave={() => onFocusTime(null)}
        onFocus={() => onFocusTime(best)}
        onBlur={() => onFocusTime(null)}
        className="flex w-full flex-wrap items-center gap-4 p-4 text-left duration-500 outline-none animate-in fade-in-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:animate-none sm:gap-5 sm:p-5"
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
            {isEveryone
              ? copy.everyoneTitle
              : `${best.participantIds.length} ${messages.board.outOf} ${people.length} ${copy.partialTitle}`}
          </span>
          <span className="mt-0.5 block text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {hoursOf(best)}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground first-letter:uppercase">
            {longDate.format(parseDate(best.startKey))} · {formatDuration(best.keys.length * slotMinutes)}
          </span>
        </span>

        <span className="flex flex-col items-end gap-1">
          <Avatars ids={best.participantIds} people={people} />
          <span className="sr-only">{names}</span>
          {!isEveryone && (
            <span className="max-w-40 truncate text-xs text-muted-foreground">{names}</span>
          )}
        </span>
      </button>

      {options.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-t bg-muted/30 px-4 py-2.5 sm:px-5">
          <span className="shrink-0 text-xs text-muted-foreground">{copy.alternatives}</span>
          {options.map((time) => (
            <button
              key={time.startKey + time.participantIds.join()}
              type="button"
              onMouseEnter={() => onFocusTime(time)}
              onMouseLeave={() => onFocusTime(null)}
              onFocus={() => onFocusTime(time)}
              onBlur={() => onFocusTime(null)}
              title={time.participantIds.map((id) => people.find((person) => person.id === id)?.name).join(", ")}
              className="flex shrink-0 items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-2 text-xs transition-colors outline-none hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium tabular-nums">
                {time.participantIds.length}/{people.length}
              </span>
              <span className="font-medium">
                {weekdayOf(time.startKey)} {dayNumber.format(parseDate(time.startKey))}
              </span>
              <span className="text-muted-foreground tabular-nums">{hoursOf(time)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
