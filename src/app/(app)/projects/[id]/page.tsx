import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadMyBoard, saveMyWeek } from "@/app/(app)/projects/actions";
import { InviteButton } from "@/components/board/invite-button";
import { ProjectBoard } from "@/components/board/project-board";
import { PageContainer, PageHeader, PageSkeleton } from "@/components/layout/page-header";
import { ProjectManage } from "@/components/projects/project-manage";
import { messages } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { getBoardMembers, resolveWeek, todayIn } from "@/lib/availability/store";
import { getOrigin } from "@/lib/origin";
import { getActiveInvitation, getProject, getProjectMembers } from "@/lib/projects/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const { manage } = messages.projects;

async function ProjectContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const project = await getProject(id);
  if (!project) notFound();

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", id)
    .eq("user_id", user.id)
    .is("removed_at", null)
    .maybeSingle();
  if (!member) notFound();

  const isHost = project.host_id === user.id;
  const admin = createAdminClient();
  const today = todayIn(project.time_zone);
  const week = resolveWeek(undefined, today, project);
  const [boardMembers, members, invitation, origin] = await Promise.all([
    getBoardMembers(admin, id, week, project),
    isHost ? getProjectMembers(id) : [],
    // Reading the link needs the admin client for non-hosts. Membership is confirmed above.
    isHost
      ? getActiveInvitation(id)
      : project.members_can_invite
        ? admin
            .from("invitations")
            .select("id, token")
            .eq("project_id", id)
            .is("revoked_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => data)
        : null,
    getOrigin(),
  ]);
  const inviteUrl = invitation ? `${origin}/join/${invitation.token}` : null;
  const isActive = project.status === "active";

  return (
    <PageContainer>
      <PageHeader
        title={project.name}
        description={isActive ? undefined : manage.archivedNotice}
        action={inviteUrl && isActive ? <InviteButton url={inviteUrl} /> : undefined}
      />
      <ProjectBoard
        load={loadMyBoard.bind(null, id)}
        save={saveMyWeek.bind(null, id)}
        memberId={member.id}
        initialWeek={week}
        initialMembers={boardMembers}
        startDate={project.start_date}
        endDate={project.end_date}
        today={today}
        slotMinutes={project.slot_minutes}
        timeZone={project.time_zone}
        readOnly={!isActive}
      />
      {isHost && (
        <ProjectManage
          projectId={id}
          status={project.status}
          members={members}
          invitation={invitation}
          inviteUrl={inviteUrl}
        />
      )}
    </PageContainer>
  );
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}
