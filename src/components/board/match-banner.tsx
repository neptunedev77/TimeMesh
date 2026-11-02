"use client";

import { Hourglass, PartyPopper, SearchX, Users } from "lucide-react";
import { messages } from "@/i18n";
import { type BestTime, type MatchState, memberColor } from "@/lib/availability/board";
import { cn } from "@/lib/utils";

const copy = messages.board.banner;

type Person = { id: string; name: string };

type MatchBannerProps = {
  state: MatchState;
  people: Person[];
  describe: (match: BestTime) => { day: string; hours: string };
};

/** The headline of the board: what the group found, large enough to see at a glance. */
export function MatchBanner({ state, people, describe }: MatchBannerProps) {
  if (state.kind === "waiting" || state.kind === "none") {
    const Icon = state.kind === "waiting" ? Hourglass : SearchX;

    return (
      <section className="flex items-center gap-3 rounded-2xl border border-dashed bg-muted/40 p-4 sm:p-5">
        <Icon className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium">{state.kind === "waiting" ? copy.waitingTitle : copy.noneTitle}</p>
          <p className="text-sm text-muted-foreground">
            {state.kind === "waiting" ? copy.waitingDescription : copy.noneDescription}
          </p>
        </div>
      </section>
    );
  }

  const [first, ...others] = state.matches;
  const isEveryone = state.kind === "everyone";
  const { day, hours } = describe(first);
  const Icon = isEveryone ? PartyPopper : Users;

  return (
    <section
      key={first.startKey + first.participantIds.join()}
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 duration-500 animate-in fade-in-0 slide-in-from-top-2 motion-reduce:animate-none sm:p-6",
        isEveryone
          ? "bg-linear-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/30"
          : "border-2 border-foreground bg-card",
      )}
    >
      <p className={cn("flex items-center gap-2 text-sm font-medium", !isEveryone && "text-muted-foreground")}>
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {isEveryone
          ? copy.everyoneTitle
          : `${first.participantIds.length} ${messages.board.outOf} ${people.length} ${copy.partialTitle}`}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight wrap-break-word sm:text-4xl">
        {day}, <span className="tabular-nums">{hours}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex -space-x-1.5" aria-label={first.participantIds.map((id) => people.find((person) => person.id === id)?.name).join(", ")}>
          {first.participantIds.map((id) => {
            const index = people.findIndex((person) => person.id === id);

            return (
              <span
                key={id}
                title={people[index]?.name}
                style={{ backgroundColor: memberColor(index) }}
                className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white"
              >
                {people[index]?.name.trim().charAt(0).toUpperCase()}
              </span>
            );
          })}
        </div>
        {others.length > 0 && (
          <p className={cn("text-sm", isEveryone ? "text-white/90" : "text-muted-foreground")}>
            {copy.alsoAt} {others.map((match) => { const { day: otherDay, hours: otherHours } = describe(match); return `${otherDay}, ${otherHours}`; }).join(" · ")}
          </p>
        )}
      </div>
    </section>
  );
}
