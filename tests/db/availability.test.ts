import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getBoardMembers, plannedDates, resolveWeek, saveWeek } from "@/lib/availability/store";
import { joinAsGuest, resolveGuest } from "@/lib/projects/membership";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(url, process.env.SUPABASE_SECRET_KEY!, options);
const userIds: string[] = [];

const WEEK = "2026-11-02";
const project = { start_date: WEEK, end_date: "2026-11-22", slot_minutes: 30, time_zone: "Europe/Lisbon" };
const nineToTen = ["2026-11-02T09:00", "2026-11-02T09:30"];

async function signUp(name: string): Promise<{ client: SupabaseClient<Database>; id: string }> {
  const email = `${randomUUID()}@example.test`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (error) throw error;
  userIds.push(data.user.id);

  const client = createClient<Database>(url, publishableKey, options);
  await client.auth.signInWithPassword({ email, password });
  return { client, id: data.user.id };
}

describe("saving availability", () => {
  let host: Awaited<ReturnType<typeof signUp>>;
  let projectId: string;
  let hostMemberId: string;
  let token: string;

  const cellsOf = async (memberId: string, week = WEEK) =>
    (await getBoardMembers(admin, projectId, week, project)).find(({ id }) => id === memberId)?.cells;

  async function addGuest(name: string) {
    const joined = await joinAsGuest(admin, token, name);
    if (!joined.ok) throw new Error(joined.reason);
    const guest = await resolveGuest(admin, joined.guestToken);
    return { id: guest!.id, token: joined.guestToken };
  }

  beforeAll(async () => {
    host = await signUp("Host");
    const created = await admin
      .from("projects")
      .insert({ host_id: host.id, name: "Projeto", start_date: project.start_date, end_date: project.end_date })
      .select("id")
      .single();
    projectId = created.data!.id;
    const member = await admin.from("project_members").select("id").eq("project_id", projectId).single();
    hostMemberId = member.data!.id;
    const invitation = await admin
      .from("invitations")
      .insert({ project_id: projectId, created_by: host.id })
      .select("token")
      .single();
    token = invitation.data!.token;
  });

  afterAll(async () => {
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  it("saves a week and shows it on the board", async () => {
    expect(await saveWeek(host.client, hostMemberId, project, WEEK, nineToTen)).toBe(true);
    expect(await cellsOf(hostMemberId)).toEqual(nineToTen);
  });

  it("replaces the week instead of adding to it", async () => {
    await saveWeek(host.client, hostMemberId, project, WEEK, nineToTen);
    await saveWeek(host.client, hostMemberId, project, WEEK, ["2026-11-03T15:00"]);

    expect(await cellsOf(hostMemberId)).toEqual(["2026-11-03T15:00"]);
  });

  it("leaves other weeks untouched", async () => {
    await saveWeek(host.client, hostMemberId, project, "2026-11-09", ["2026-11-09T10:00"]);
    await saveWeek(host.client, hostMemberId, project, WEEK, []);

    expect(await cellsOf(hostMemberId, "2026-11-09")).toEqual(["2026-11-09T10:00"]);
    expect(await cellsOf(hostMemberId)).toEqual([]);
  });

  it("shows every participant, including those with no hours", async () => {
    const guest = await addGuest("Sem horas");
    const members = await getBoardMembers(admin, projectId, WEEK, project);

    expect(members.find(({ id }) => id === guest.id)).toEqual({ id: guest.id, name: "Sem horas", cells: [] });
  });

  it("lets a guest save through their own member", async () => {
    const guest = await addGuest("Rita");

    expect(await saveWeek(admin, guest.id, project, WEEK, nineToTen)).toBe(true);
    expect(await cellsOf(guest.id)).toEqual(nineToTen);
  });

  it("stops a registered user from writing a guest's week", async () => {
    const guest = await addGuest("Alvo");

    expect(await saveWeek(host.client, guest.id, project, WEEK, nineToTen)).toBe(false);
    expect(await saveWeek(host.client, guest.id, project, WEEK, [])).toBe(false);
    expect(await cellsOf(guest.id)).toEqual([]);
  });

  it("does not delete anything when a save is rejected", async () => {
    const guest = await addGuest("Atómica");
    await saveWeek(admin, guest.id, project, WEEK, nineToTen);

    expect(await saveWeek(host.client, guest.id, project, WEEK, [])).toBe(false);
    expect(await cellsOf(guest.id)).toEqual(nineToTen);
  });

  it("rejects bad input and dates outside the week or the period", async () => {
    expect(await saveWeek(host.client, hostMemberId, project, WEEK, ["2026-11-09T09:00"])).toBe(false);
    expect(await saveWeek(host.client, hostMemberId, project, WEEK, ["2026-11-02T09:10"])).toBe(false);
    expect(await saveWeek(host.client, hostMemberId, project, WEEK, "nope")).toBe(false);
    expect(await saveWeek(host.client, hostMemberId, project, "2026-11-03", [])).toBe(false);
    expect(await saveWeek(host.client, hostMemberId, project, "2027-01-04", [])).toBe(false);
  });

  it("stops removed members from saving, and drops them from the board", async () => {
    const guest = await addGuest("Removida");
    await saveWeek(admin, guest.id, project, WEEK, nineToTen);
    await admin.from("project_members").update({ removed_at: new Date().toISOString() }).eq("id", guest.id);

    expect(await saveWeek(admin, guest.id, project, WEEK, nineToTen)).toBe(false);
    expect(await resolveGuest(admin, guest.token)).toBeNull();
    expect(await cellsOf(guest.id)).toBeUndefined();
  });

  it("stops saves once the project isn't active", async () => {
    const created = await admin
      .from("projects")
      .insert({ host_id: host.id, name: "Arquivado", start_date: WEEK, end_date: "2026-11-08", status: "archived" })
      .select("id")
      .single();
    const member = await admin.from("project_members").select("id").eq("project_id", created.data!.id).single();

    expect(await saveWeek(host.client, member.data!.id, project, WEEK, nineToTen)).toBe(false);
  });
});

describe("choosing a week", () => {
  it("uses the requested week when it is in the period", () => {
    expect(resolveWeek("2026-11-11", "2026-01-01", project)).toBe("2026-11-09");
  });

  it("falls back to the current week, then the first one", () => {
    expect(resolveWeek("2030-01-01", "2026-11-18", project)).toBe("2026-11-16");
    expect(resolveWeek(undefined, "2030-01-01", project)).toBe(WEEK);
    expect(resolveWeek("nonsense", "2030-01-01", project)).toBe(WEEK);
  });

  it("only offers days inside the period", () => {
    expect(plannedDates("2026-11-16", { ...project, end_date: "2026-11-18" })).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
    ]);
  });
});
