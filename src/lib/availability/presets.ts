export type TimeRange = {
  startTime: string;
  endTime: string;
};

export type PresetName = "entireDay" | "morning" | "afternoon" | "evening" | "night";

export const defaultPresets: Record<Exclude<PresetName, "entireDay">, TimeRange> = {
  morning: { startTime: "08:00", endTime: "12:00" },
  afternoon: { startTime: "12:00", endTime: "18:00" },
  evening: { startTime: "18:00", endTime: "23:00" },
  night: { startTime: "23:00", endTime: "08:00" },
};

/** "Entire day" means the person's usual schedule, never 00:00 to 24:00. */
export function resolvePreset(
  preset: PresetName,
  usualSchedule: TimeRange,
  presets: typeof defaultPresets = defaultPresets,
): TimeRange {
  return preset === "entireDay" ? usualSchedule : presets[preset];
}
