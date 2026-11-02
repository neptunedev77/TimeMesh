import type { Metadata } from "next";
import { Suspense } from "react";
import { loadGuestBoard, saveGuestWeek } from "@/app/guest/actions";
import { InviteButton } from "@/components/board/invite-button";
import { ProjectBoard } from "@/components/board/project-board";
import { PageHeader } from "@/components/layout/page-header";
import { InvalidLink, PublicCard, PublicShell } from "@/components/layout/public-shell";
import { CopyLink } from "@/components/ui-extra/copy-button";
import { messages } from "@/i18n";
import { getBoardMembers, resolveWeek, todayIn } from "@/lib/availability/store";
import { getOrigin } from "@/lib/origin";
import { resolveGuest } from "@/lib/projects/membership";
import { createAdminClient } from "@/lib/supabase/admin";

const { board, guest } = messages;

export const metadata: Metadata = { robots: { index: false } };

async function GuestContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const member = await resolveGuest(admin, token);
  if (!member) return <InvalidLink title={guest.invalidTitle} description={guest.invalidDescription} />;

  const { project } = member;
  const today = todayIn(project.time_zone);
  const week = resolveWeek(undefined, today, project);
  const [boardMembers, origin, invitation] = await Promise.all([
    getBoardMembers(admin, project.id, week, project),
    getOrigin(),
    admin
      .from("invitations")
      .select("token")
      .eq("project_id", project.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const { data: settings } = await admin
    .from("projects")
    .select("members_can_invite")
    .eq("id", project.id)
    .single();
  const inviteUrl =
    invitation.data && settings?.members_can_invite ? `${origin}/join/${invitation.data.token}` : null;

  return (
    <>
      <PageHeader title={project.name} action={inviteUrl ? <InviteButton url={inviteUrl} /> : undefined} />
      <ProjectBoard
        load={loadGuestBoard.bind(null, token)}
        save={saveGuestWeek.bind(null, token)}
        memberId={member.id}
        initialWeek={week}
        initialMembers={boardMembers}
        startDate={project.start_date}
        endDate={project.end_date}
        today={today}
        slotMinutes={project.slot_minutes}
        timeZone={project.time_zone}
        readOnly={project.status !== "active"}
      />
      <PublicCard>
        <h2 className="font-medium">{board.saveLinkTitle}</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">{board.saveLinkDescription}</p>
        <CopyLink value={`${origin}/guest/${token}`} label={board.saveLinkTitle} />
      </PublicCard>
    </>
  );
}

export default function GuestPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <PublicShell wide>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" aria-hidden="true" />}>
        <GuestContent params={params} />
      </Suspense>
    </PublicShell>
  );
}
