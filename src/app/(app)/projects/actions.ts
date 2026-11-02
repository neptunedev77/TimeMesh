"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/forms/use-action-form";
import { messages } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { mondayOf } from "@/lib/availability/grid";
import { getBoardMembers, saveWeek, todayIn } from "@/lib/availability/store";
import { addDays } from "@/lib/availability/timezone";
import { getOrigin } from "@/lib/origin";
import { rotateGuestToken } from "@/lib/projects/membership";
import { projectNameSchema } from "@/lib/projects/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const { errors, manage } = messages.projects;
const TIME_ZONE = "Europe/Lisbon";
const PLANNING_DAYS = 364;

export type GuestLinkState = {
  link?: string;
  error?: string;
};

// These use the user's session, so Row Level Security enforces who the host is. The exceptions
// are rotateGuestLink and the board's load, which check it first because they need the admin client.

export async function createProject(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const name = projectNameSchema.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0]?.message ?? errors.generic };

  const startDate = mondayOf(todayIn(TIME_ZONE));
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name: name.data,
      host_id: user.id,
      time_zone: TIME_ZONE,
      start_date: startDate,
      end_date: addDays(startDate, PLANNING_DAYS),
      planning_mode: "multi_week",
      members_can_invite: true,
    })
    .select("id")
    .single();
  if (error) return { error: errors.generic };

  await supabase.from("invitations").insert({ project_id: project.id, created_by: user.id });

  redirect(`/projects/${project.id}`);
}

async function getMyMembership(projectId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("id, project:projects!inner(start_date, end_date, slot_minutes, time_zone)")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .is("removed_at", null)
    .maybeSingle();

  return data ? { member: data, supabase } : null;
}

export async function loadMyBoard(projectId: string, week: string) {
  const membership = await getMyMembership(projectId);
  if (!membership) return { error: true as const };

  return { members: await getBoardMembers(createAdminClient(), projectId, week, membership.member.project) };
}

export async function saveMyWeek(projectId: string, week: string, cells: string[]) {
  const membership = await getMyMembership(projectId);
  if (!membership) return { ok: false };

  const { member, supabase } = membership;
  return { ok: await saveWeek(supabase, member.id, member.project, week, cells) };
}

export async function setProjectStatus(projectId: string, status: "active" | "archived") {
  await getCurrentUser();
  const supabase = await createClient();
  await supabase.from("projects").update({ status }).eq("id", projectId);

  revalidatePath("/", "layout");
}

export async function createInvitation(projectId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  await supabase.from("invitations").insert({ project_id: projectId, created_by: user.id });

  revalidatePath(`/projects/${projectId}`);
}

export async function revokeInvitation(projectId: string, invitationId: string) {
  await getCurrentUser();
  const supabase = await createClient();
  await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("project_id", projectId);

  revalidatePath(`/projects/${projectId}`);
}

export async function removeMember(projectId: string, memberId: string) {
  await getCurrentUser();
  const supabase = await createClient();
  await supabase
    .from("project_members")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("project_id", projectId);

  revalidatePath(`/projects/${projectId}`);
}

export async function rotateGuestLink(projectId: string, memberId: string): Promise<GuestLinkState> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!project) return { error: manage.newLinkFailed };

  const guestToken = await rotateGuestToken(createAdminClient(), projectId, memberId);
  if (!guestToken) return { error: manage.newLinkFailed };

  return { link: `${await getOrigin()}/guest/${guestToken}` };
}
