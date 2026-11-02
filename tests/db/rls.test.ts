import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

// Runs against local Supabase and attempts real access with real sessions.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient<Database>(url, secretKey, options);
const anonymous = createClient<Database>(url, publishableKey, options);
const userIds: string[] = [];

type Client = SupabaseClient<Database>;

async function signUp(name: string): Promise<{ client: Client; id: string }> {
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
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;

  return { client, id: data.user.id };
}

async function createProject(client: Client, hostId: string, name: string) {
  const { data, error } = await client
    .from("projects")
    .insert({ host_id: hostId, name, start_date: "2026-11-02", end_date: "2026-11-08" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function addMember(projectId: string, userId: string, displayName: string) {
  const { data, error } = await admin
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId, display_name: displayName })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

const slot = (memberId: string) => ({
  member_id: memberId,
  starts_at: "2026-11-02T09:00:00Z",
  ends_at: "2026-11-02T10:00:00Z",
});

describe("row level security", () => {
  let host: Awaited<ReturnType<typeof signUp>>;
  let participant: Awaited<ReturnType<typeof signUp>>;
  let outsider: Awaited<ReturnType<typeof signUp>>;
  let projectId: string;
  let otherProjectId: string;
  let hostMemberId: string;
  let participantMemberId: string;
  let guestMemberId: string;
  let otherMemberId: string;

  beforeAll(async () => {
    [host, participant, outsider] = await Promise.all([
      signUp("Host"),
      signUp("Participante"),
      signUp("Externo"),
    ]);
    projectId = await createProject(host.client, host.id, "Projeto");
    otherProjectId = await createProject(outsider.client, outsider.id, "Outro projeto");
    participantMemberId = await addMember(projectId, participant.id, "Participante");

    const hostMember = await admin
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("role", "host")
      .single();
    hostMemberId = hostMember.data!.id;

    const otherMember = await admin
      .from("project_members")
      .select("id")
      .eq("project_id", otherProjectId)
      .eq("role", "host")
      .single();
    otherMemberId = otherMember.data!.id;

    const guest = await admin
      .from("project_members")
      .insert({ project_id: projectId, guest_token_hash: randomUUID(), display_name: "Convidado" })
      .select("id")
      .single();
    guestMemberId = guest.data!.id;

    await admin.from("availability_entries").insert(slot(hostMemberId));
  });

  afterAll(async () => {
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  it("creates a profile for each new account", async () => {
    const { data } = await host.client.from("profiles").select("display_name").single();

    expect(data?.display_name).toBe("Host");
  });

  it("adds the host as a member of a new project", async () => {
    const { data } = await host.client
      .from("project_members")
      .select("role, user_id")
      .eq("project_id", projectId)
      .eq("role", "host")
      .single();

    expect(data?.user_id).toBe(host.id);
  });

  it("blocks visitors without a session from every table", async () => {
    const tables = [
      "profiles",
      "projects",
      "project_members",
      "invitations",
      "availability_rules",
      "availability_entries",
      "member_weeks",
      "sessions",
      "session_participants",
    ] as const;

    for (const table of tables) {
      const { data, error } = await anonymous.from(table).select("*").limit(1);
      expect(data, table).toBeNull();
      expect(error, table).not.toBeNull();
    }
  });

  it("hides other people's profiles", async () => {
    const { data } = await participant.client.from("profiles").select("id");

    expect(data?.map(({ id }) => id)).toEqual([participant.id]);
  });

  it("hides a project and its data from outsiders", async () => {
    const project = await outsider.client.from("projects").select("id").eq("id", projectId);
    const members = await outsider.client.from("project_members").select("id").eq("project_id", projectId);
    const entries = await outsider.client.from("availability_entries").select("id").eq("member_id", hostMemberId);

    expect(project.data).toEqual([]);
    expect(members.data).toEqual([]);
    expect(entries.data).toEqual([]);
  });

  it("stops outsiders from changing a project", async () => {
    const { data } = await outsider.client
      .from("projects")
      .update({ name: "Alterado" })
      .eq("id", projectId)
      .select();

    expect(data).toEqual([]);
  });

  it("stops a user from creating a project for someone else", async () => {
    const { error } = await outsider.client
      .from("projects")
      .insert({ host_id: host.id, name: "Falso", start_date: "2026-11-02", end_date: "2026-11-03" });

    expect(error).not.toBeNull();
  });

  it("stops users from adding themselves to a project", async () => {
    const { error } = await outsider.client
      .from("project_members")
      .insert({ project_id: projectId, user_id: outsider.id, display_name: "Intruso" });

    expect(error).not.toBeNull();
  });

  it("never exposes guest token hashes", async () => {
    const { error } = await host.client.from("project_members").select("guest_token_hash");

    expect(error).not.toBeNull();
  });

  it("lets members write only their own availability", async () => {
    const own = await participant.client.from("availability_entries").insert(slot(participantMemberId));
    const otherPerson = await participant.client.from("availability_entries").insert(slot(hostMemberId));
    const guest = await participant.client.from("availability_entries").insert(slot(guestMemberId));
    const otherProject = await participant.client.from("availability_entries").insert(slot(otherMemberId));

    expect(own.error).toBeNull();
    expect(otherPerson.error).not.toBeNull();
    expect(guest.error).not.toBeNull();
    expect(otherProject.error).not.toBeNull();
  });

  it("stops members from deleting someone else's availability", async () => {
    const { data } = await participant.client
      .from("availability_entries")
      .delete()
      .eq("member_id", hostMemberId)
      .select();

    expect(data).toEqual([]);
  });

  it("hides individual availability when the project turns it off", async () => {
    const visible = await participant.client.from("availability_entries").select("id").eq("member_id", hostMemberId);
    expect(visible.data).toHaveLength(1);

    await host.client.from("projects").update({ show_individual_availability: false }).eq("id", projectId);
    const hidden = await participant.client.from("availability_entries").select("id").eq("member_id", hostMemberId);
    const forHost = await host.client.from("availability_entries").select("id").eq("member_id", participantMemberId);
    await host.client.from("projects").update({ show_individual_availability: true }).eq("id", projectId);

    expect(hidden.data).toEqual([]);
    expect(forHost.data?.length).toBeGreaterThan(0);
  });

  it("lets only the host manage invitations", async () => {
    const created = await host.client
      .from("invitations")
      .insert({ project_id: projectId, created_by: host.id })
      .select("token")
      .single();
    const forParticipant = await participant.client.from("invitations").select("token").eq("project_id", projectId);
    const byParticipant = await participant.client
      .from("invitations")
      .insert({ project_id: projectId, created_by: participant.id });

    expect(created.data?.token).toHaveLength(64);
    expect(forParticipant.data).toEqual([]);
    expect(byParticipant.error).not.toBeNull();
  });

  it("keeps sessions host-managed and blocks members of other projects", async () => {
    const session = await host.client
      .from("sessions")
      .insert({
        project_id: projectId,
        title: "Sessão",
        starts_at: "2026-11-02T09:00:00Z",
        ends_at: "2026-11-02T10:00:00Z",
        created_by: host.id,
      })
      .select("id")
      .single();
    const sessionId = session.data!.id;

    const byParticipant = await participant.client.from("sessions").insert({
      project_id: projectId,
      title: "Falsa",
      starts_at: "2026-11-02T09:00:00Z",
      ends_at: "2026-11-02T10:00:00Z",
      created_by: participant.id,
    });
    const invited = await host.client
      .from("session_participants")
      .insert({ session_id: sessionId, member_id: participantMemberId, project_id: projectId });
    const fromOtherProject = await admin
      .from("session_participants")
      .insert({ session_id: sessionId, member_id: otherMemberId, project_id: projectId });

    expect(session.error).toBeNull();
    expect(byParticipant.error).not.toBeNull();
    expect(invited.error).toBeNull();
    expect(fromOtherProject.error).not.toBeNull();

    const answered = await participant.client
      .from("session_participants")
      .update({ response: "accepted" })
      .eq("session_id", sessionId)
      .eq("member_id", participantMemberId)
      .select("response");
    const movedAnswer = await participant.client
      .from("session_participants")
      .update({ member_id: hostMemberId })
      .eq("session_id", sessionId);

    expect(answered.data).toEqual([{ response: "accepted" }]);
    expect(movedAnswer.error).not.toBeNull();
  });

  it("removes access as soon as a member is removed", async () => {
    const extra = await signUp("Removido");
    const memberId = await addMember(projectId, extra.id, "Removido");

    const before = await extra.client.from("projects").select("id").eq("id", projectId);
    expect(before.data).toHaveLength(1);

    const removed = await host.client
      .from("project_members")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", memberId)
      .select("id");
    const after = await extra.client.from("projects").select("id").eq("id", projectId);
    const write = await extra.client.from("availability_entries").insert(slot(memberId));

    expect(removed.data).toHaveLength(1);
    expect(after.data).toEqual([]);
    expect(write.error).not.toBeNull();
  });

  it("stops a participant from removing someone, and the host from being removed", async () => {
    const byParticipant = await participant.client
      .from("project_members")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", guestMemberId)
      .select("id");
    const hostItself = await host.client
      .from("project_members")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", hostMemberId)
      .select("id");

    expect(byParticipant.data).toEqual([]);
    expect(hostItself.data).toEqual([]);
  });
});
