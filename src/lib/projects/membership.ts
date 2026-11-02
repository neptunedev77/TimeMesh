import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Every function here takes the admin client, so each one enforces its own access rules.
type AdminClient = SupabaseClient<Database>;

const INVITE_PROJECT_FIELDS =
  "id, name, description, type, start_date, end_date, status, allow_guests, time_zone, slot_minutes";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Returns the project behind an invitation, only while the link is valid and the project is open. */
export async function getInvitedProject(admin: AdminClient, token: string) {
  const { data } = await admin
    .from("invitations")
    .select(`project:projects!inner(${INVITE_PROJECT_FIELDS})`)
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();

  return data?.project.status === "active" ? data.project : null;
}

export type GuestJoinResult =
  | { ok: true; guestToken: string }
  | { ok: false; reason: "invalid_invitation" | "guests_not_allowed" | "failed" };

export async function joinAsGuest(
  admin: AdminClient,
  invitationToken: string,
  displayName: string,
): Promise<GuestJoinResult> {
  const project = await getInvitedProject(admin, invitationToken);
  if (!project) return { ok: false, reason: "invalid_invitation" };
  if (!project.allow_guests) return { ok: false, reason: "guests_not_allowed" };

  const guestToken = generateToken();
  const { error } = await admin.from("project_members").insert({
    project_id: project.id,
    display_name: displayName,
    guest_token_hash: hashToken(guestToken),
  });

  return error ? { ok: false, reason: "failed" } : { ok: true, guestToken };
}

export type UserJoinResult =
  | { ok: true; projectId: string }
  | { ok: false; reason: "invalid_invitation" | "removed" | "failed" };

export async function joinAsUser(
  admin: AdminClient,
  invitationToken: string,
  user: { id: string; displayName: string },
): Promise<UserJoinResult> {
  const project = await getInvitedProject(admin, invitationToken);
  if (!project) return { ok: false, reason: "invalid_invitation" };

  const findMember = () =>
    admin
      .from("project_members")
      .select("removed_at")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .maybeSingle();

  const existing = await findMember();
  if (existing.data) {
    return existing.data.removed_at
      ? { ok: false, reason: "removed" }
      : { ok: true, projectId: project.id };
  }

  const { error } = await admin
    .from("project_members")
    .insert({ project_id: project.id, user_id: user.id, display_name: user.displayName });

  return error ? { ok: false, reason: "failed" } : { ok: true, projectId: project.id };
}

/** The only way to identify a guest. Returns nothing once they are removed or the project is archived. */
export async function resolveGuest(admin: AdminClient, guestToken: string) {
  const { data } = await admin
    .from("project_members")
    .select(`id, display_name, project:projects!inner(${INVITE_PROJECT_FIELDS})`)
    .eq("guest_token_hash", hashToken(guestToken))
    .is("removed_at", null)
    .maybeSingle();

  return data && data.project.status !== "archived" ? data : null;
}

export async function renameGuest(admin: AdminClient, guestToken: string, displayName: string) {
  const guest = await resolveGuest(admin, guestToken);
  if (!guest) return false;

  const { error } = await admin
    .from("project_members")
    .update({ display_name: displayName })
    .eq("id", guest.id);

  return !error;
}

/** Replaces a guest's personal link, which ends access through the old one. The caller must be the host. */
export async function rotateGuestToken(admin: AdminClient, projectId: string, memberId: string) {
  const guestToken = generateToken();
  const { data } = await admin
    .from("project_members")
    .update({ guest_token_hash: hashToken(guestToken) })
    .eq("id", memberId)
    .eq("project_id", projectId)
    .is("user_id", null)
    .is("removed_at", null)
    .select("id");

  return data?.length ? guestToken : null;
}

/** Project members' names for someone already authorized to see this project. */
export async function listActiveMemberNames(admin: AdminClient, projectId: string) {
  const { data } = await admin
    .from("project_members")
    .select("id, display_name, role")
    .eq("project_id", projectId)
    .is("removed_at", null)
    .order("created_at");

  return data ?? [];
}
