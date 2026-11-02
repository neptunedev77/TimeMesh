import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BoardMember } from "./board";
import { mondayOf, type Overrides, isValidOverrides, weekDates } from "./grid";
import { entriesToOverrides, overridesToEntries, weekWindow } from "./week-data";

type Client = SupabaseClient<Database>;

export type PlanningProject = {
  start_date: string;
  end_date: string;
  slot_minutes: number;
  time_zone: string;
};

/** The dates of a week that fall inside the project's planning period. */
export function plannedDates(weekStart: string, project: Pick<PlanningProject, "start_date" | "end_date">): string[] {
  return weekDates(weekStart).filter((date) => date >= project.start_date && date <= project.end_date);
}

/** Picks a valid week: the requested one, else the current one, else the first of the period. */
export function resolveWeek(requested: unknown, today: string, project: PlanningProject): string {
  const candidates = typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? [requested, today] : [today];

  for (const candidate of candidates) {
    const week = mondayOf(candidate);
    if (plannedDates(week, project).length > 0) return week;
  }

  return mondayOf(project.start_date);
}

/** Today's date in a time zone, as YYYY-MM-DD. */
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/**
 * Everyone's marked cells for a week. Callers must have confirmed the person belongs to this
 * project: it reads with the admin client, because guests have no session.
 */
export async function getBoardMembers(
  admin: Client,
  projectId: string,
  week: string,
  project: PlanningProject,
): Promise<BoardMember[]> {
  const { start, end } = weekWindow(week, project.time_zone);
  const { data: members } = await admin
    .from("project_members")
    .select("id, display_name")
    .eq("project_id", projectId)
    .is("removed_at", null)
    .order("created_at");
  const { data: entries } = await admin
    .from("availability_entries")
    .select("member_id, starts_at, ends_at, kind")
    .in("member_id", (members ?? []).map(({ id }) => id))
    .gte("starts_at", new Date(start).toISOString())
    .lt("starts_at", new Date(end).toISOString());

  return (members ?? []).map(({ id, display_name: name }) => {
    const own = (entries ?? []).filter((entry) => entry.member_id === id);
    const overrides = entriesToOverrides(own, week, project.slot_minutes, project.time_zone);

    return {
      id,
      name,
      cells: Object.keys(overrides).filter((key) => overrides[key] === "available"),
    };
  });
}

export async function saveWeek(
  client: Client,
  memberId: string,
  project: PlanningProject,
  week: string,
  cells: unknown,
): Promise<boolean> {
  const dates = plannedDates(week, project);
  if (mondayOf(week) !== week || dates.length === 0 || !Array.isArray(cells)) return false;

  const overrides: Overrides = Object.fromEntries(cells.map((key) => [String(key), "available" as const]));
  if (!isValidOverrides(overrides, dates, project.slot_minutes)) return false;

  const { start, end } = weekWindow(week, project.time_zone);
  const { error } = await client.rpc("replace_week_availability", {
    p_member_id: memberId,
    p_week_start: week,
    p_from: new Date(start).toISOString(),
    p_to: new Date(end).toISOString(),
    p_entries: overridesToEntries(overrides, project.slot_minutes, project.time_zone),
  });

  return !error;
}
