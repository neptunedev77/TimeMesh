import { messages } from "@/i18n";
import { cn } from "@/lib/utils";

const levelClasses = ["bg-muted", "bg-mesh-1", "bg-mesh-2", "bg-mesh-3", "bg-mesh-4"];

// Illustrative only: four time blocks per weekday, as an overlap level from 0 to 4.
const levels = [
  [0, 1, 2, 1],
  [1, 2, 1, 0],
  [0, 1, 3, 2],
  [1, 2, 4, 3],
  [0, 2, 3, 1],
  [2, 3, 2, 1],
  [1, 1, 0, 0],
];

export function WeekPreview() {
  return (
    <figure
      aria-label={messages.landing.previewLabel}
      className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6"
    >
      <figcaption className="text-sm font-medium">{messages.landing.previewTitle}</figcaption>
      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2" aria-hidden="true">
        {messages.weekdays.map((day, dayIndex) => (
          <div key={day} className="flex flex-col gap-1.5 sm:gap-2">
            <span className="text-center text-xs text-muted-foreground">{day}</span>
            {levels[dayIndex].map((level, blockIndex) => (
              <span key={blockIndex} className={cn("h-9 rounded-md sm:h-12", levelClasses[level])} />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-medium">{messages.landing.previewBest}</span>
        <span className="text-muted-foreground">{messages.landing.previewCount}</span>
      </p>
    </figure>
  );
}
