import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getInvitedProject,
  hashToken,
  joinAsGuest,
  joinAsUser,
  renameGuest,
  resolveGuest,
  rotateGuestToken,
} from "@/lib/projects/membership";
import type { Database } from "@/lib/supabase/database.types";

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const userIds: string[] = [];

async function createUser(name: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${randomUUID()}@example.test`,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (error) throw error;
  userIds.push(data.user.id);
  return { id: data.user.id, displayName: name };
}

async function createProject(hostId: string, changes = {}) {
  const { data, error } = await admin
    .from("projects")
    .insert({ host_id: hostId, name: "Projeto", start_date: "2026-11-02", end_date: "2026-11-08", ...changes })
    .select("id")
    .single();
  if (error) throw error;

  const invitation = await admin
    .from("invitations")
    .insert({ project_id: data.id, created_by: hostId })
    .select("id, token")
    .single();
  if (invitation.error) throw invitation.error;

  return { id: data.id, token: invitation.data.token, invitationId: invitation.data.id };
}

async function joinGuest(token: string, name = "Convidado") {
  const result = await joinAsGuest(admin, token, name);
  if (!result.ok) throw new Error(result.reason);
  return result.guestToken;
}

describe("invitations and guests", () => {
  let host: { id: string; displayName: string };

  beforeAll(async () => {
    host = await createUser("Host");
  });

  afterAll(async () => {
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  it("lets a guest join and stores only a hash of the token", async () => {
    const project = await createProject(host.id);
    const guestToken = await joinGuest(project.token);

    const { data } = await admin
      .from("project_members")
      .select("guest_token_hash, role, user_id")
      .eq("project_id", project.id)
      .eq("display_name", "Convidado")
      .single();

    expect(data).toEqual({ guest_token_hash: hashToken(guestToken), role: "participant", user_id: null });
    expect(data?.guest_token_hash).not.toBe(guestToken);
  });

  it("identifies a returning guest by their personal link only", async () => {
    const project = await createProject(host.id);
    const guestToken = await joinGuest(project.token, "Rita");

    expect((await resolveGuest(admin, guestToken))?.display_name).toBe("Rita");
    expect(await resolveGuest(admin, generateFakeToken())).toBeNull();
    expect(await resolveGuest(admin, project.token)).toBeNull();
  });

  it("lets a guest rename only themselves", async () => {
    const project = await createProject(host.id);
    const rita = await joinGuest(project.token, "Rita");
    const rui = await joinGuest(project.token, "Rui");

    expect(await renameGuest(admin, rita, "Rita S.")).toBe(true);
    expect((await resolveGuest(admin, rita))?.display_name).toBe("Rita S.");
    expect((await resolveGuest(admin, rui))?.display_name).toBe("Rui");
    expect(await renameGuest(admin, generateFakeToken(), "Intruso")).toBe(false);
  });

  it("rejects new joins through a revoked link, but keeps existing guests", async () => {
    const project = await createProject(host.id);
    const guestToken = await joinGuest(project.token);

    await admin.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", project.invitationId);

    expect(await getInvitedProject(admin, project.token)).toBeNull();
    expect(await joinAsGuest(admin, project.token, "Novo")).toEqual({ ok: false, reason: "invalid_invitation" });
    expect(await resolveGuest(admin, guestToken)).not.toBeNull();
  });

  it("rejects unknown invitations and guests when they are turned off", async () => {
    const project = await createProject(host.id, { allow_guests: false });

    expect(await joinAsGuest(admin, "unknown", "Novo")).toEqual({ ok: false, reason: "invalid_invitation" });
    expect(await joinAsGuest(admin, project.token, "Novo")).toEqual({ ok: false, reason: "guests_not_allowed" });
  });

  it("rejects joins to a closed project", async () => {
    const project = await createProject(host.id, { status: "closed" });

    expect(await joinAsGuest(admin, project.token, "Novo")).toEqual({ ok: false, reason: "invalid_invitation" });
  });

  it("ends a guest's access when the host removes them", async () => {
    const project = await createProject(host.id);
    const guestToken = await joinGuest(project.token);
    const guest = await resolveGuest(admin, guestToken);

    await admin.from("project_members").update({ removed_at: new Date().toISOString() }).eq("id", guest!.id);

    expect(await resolveGuest(admin, guestToken)).toBeNull();
    expect(await renameGuest(admin, guestToken, "Voltei")).toBe(false);
  });

  it("ends a guest's access when the project is archived", async () => {
    const project = await createProject(host.id);
    const guestToken = await joinGuest(project.token);

    await admin.from("projects").update({ status: "archived" }).eq("id", project.id);

    expect(await resolveGuest(admin, guestToken)).toBeNull();
  });

  it("replaces a personal link and ends the old one", async () => {
    const project = await createProject(host.id);
    const oldToken = await joinGuest(project.token, "Rita");
    const guest = await resolveGuest(admin, oldToken);

    const newToken = await rotateGuestToken(admin, project.id, guest!.id);

    expect(await resolveGuest(admin, oldToken)).toBeNull();
    expect((await resolveGuest(admin, newToken!))?.display_name).toBe("Rita");
  });

  it("does not replace a link through another project", async () => {
    const project = await createProject(host.id);
    const otherProject = await createProject(host.id);
    const guestToken = await joinGuest(project.token);
    const guest = await resolveGuest(admin, guestToken);

    expect(await rotateGuestToken(admin, otherProject.id, guest!.id)).toBeNull();
    expect(await resolveGuest(admin, guestToken)).not.toBeNull();
  });

  it("adds a registered user once, and keeps a removed user out", async () => {
    const project = await createProject(host.id);
    const user = await createUser("Registada");

    expect(await joinAsUser(admin, project.token, user)).toEqual({ ok: true, projectId: project.id });
    expect(await joinAsUser(admin, project.token, user)).toEqual({ ok: true, projectId: project.id });

    const { data } = await admin.from("project_members").select("id").eq("project_id", project.id).eq("user_id", user.id);
    expect(data).toHaveLength(1);

    await admin.from("project_members").update({ removed_at: new Date().toISOString() }).eq("id", data![0].id);
    expect(await joinAsUser(admin, project.token, user)).toEqual({ ok: false, reason: "removed" });
  });
});

function generateFakeToken() {
  return randomUUID();
}
