import "server-only";
import { createClient } from "@/lib/supabase/server";

const PROJECT_CARD_FIELDS = "id, name, type, start_date, end_date, status, host_id, time_zone";

/** Everything here runs with the user's session, so Row Level Security applies. */
export async function getMyProjects(userId: string) {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("project_members")
    .select(`id, project:projects!inner(${PROJECT_CARD_FIELDS})`)
    .eq("user_id", userId)
    .is("removed_at", null);

  if (!memberships?.length) return [];

  const projectIds = memberships.map(({ project }) => project.id);
  const [{ data: members }, { data: sessions }] = await Promise.all([
    supabase
      .from("project_members")
      .select("id, project_id, display_name, role")
      .in("project_id", projectIds)
      .is("removed_at", null),
    supabase
      .from("sessions")
      .select("project_id, title, starts_at")
      .in("project_id", projectIds)
      .eq("status", "confirmed")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at"),
  ]);
  const { data: weeks } = await supabase
    .from("member_weeks")
    .select("member_id")
    .in("member_id", (members ?? []).map(({ id }) => id));
  const submitted = new Set((weeks ?? []).map(({ member_id }) => member_id));

  return memberships
    .map(({ id: memberId, project }) => {
      const projectMembers = (members ?? []).filter((member) => member.project_id === project.id);

      return {
        ...project,
        isHost: project.host_id === userId,
        hostName: projectMembers.find(({ role }) => role === "host")?.display_name ?? "",
        participantCount: projectMembers.length,
        submittedCount: projectMembers.filter(({ id }) => submitted.has(id)).length,
        hasSubmitted: submitted.has(memberId),
        nextSession: sessions?.find((session) => session.project_id === project.id) ?? null,
      };
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export type ProjectSummary = Awaited<ReturnType<typeof getMyProjects>>[number];

export async function getProject(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();

  return data;
}

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("project_members")
    .select("id, user_id, display_name, role, created_at")
    .eq("project_id", projectId)
    .is("removed_at", null)
    .order("created_at");

  const { data: weeks } = await supabase
    .from("member_weeks")
    .select("member_id, updated_at")
    .in("member_id", (members ?? []).map(({ id }) => id))
    .order("updated_at", { ascending: false });

  return (members ?? []).map((member) => ({
    ...member,
    isGuest: member.user_id === null,
    lastUpdated: weeks?.find(({ member_id }) => member_id === member.id)?.updated_at ?? null,
  }));
}

export type ProjectMember = Awaited<ReturnType<typeof getProjectMembers>>[number];

export async function getActiveInvitation(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitations")
    .select("id, token")
    .eq("project_id", projectId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
