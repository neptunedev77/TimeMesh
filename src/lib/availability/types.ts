// Half-open interval [start, end) in UTC epoch milliseconds.
export type Interval = {
  start: number;
  end: number;
};

export type AvailabilityKind = "available" | "unavailable";

export type EntrySource = "manual" | "exception" | "recurring";

export type AvailabilityEntry = Interval & {
  kind: AvailabilityKind;
  source: EntrySource;
};

export type Participant = {
  id: string;
  entries: AvailabilityEntry[];
};

export type OverlapSegment = Interval & {
  availableIds: string[];
  unavailableIds: string[];
  ratio: number;
};

export type RecurringRule = {
  // ISO weekday: 1 is Monday, 7 is Sunday.
  weekday: number;
  // Local wall-clock times as HH:mm. An end at or before the start ends on the next day.
  startTime: string;
  endTime: string;
  kind: AvailabilityKind;
};
