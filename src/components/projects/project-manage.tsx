import { createInvitation, removeMember, revokeInvitation, rotateGuestLink, setProjectStatus } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui-extra/confirm-action";
import { CopyLink } from "@/components/ui-extra/copy-button";
import { messages } from "@/i18n";
import type { ProjectMember } from "@/lib/projects/queries";
import { GuestLinkAction } from "./guest-link-action";

const { invite, manage } = messages.projects;

type ProjectManageProps = {
  projectId: string;
  status: "active" | "closed" | "archived";
  members: ProjectMember[];
  invitation: { id: string } | null;
  inviteUrl: string | null;
};

/** Everything a host rarely needs, kept out of the way below the board. */
export function ProjectManage({ projectId, status, members, invitation, inviteUrl }: ProjectManageProps) {
  const participants = members.filter(({ role }) => role !== "host");

  return (
    <details className="group rounded-2xl border bg-card shadow-xs">
      <summary className="cursor-pointer list-none rounded-2xl p-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {manage.title}
      </summary>
      <div className="flex flex-col gap-5 border-t p-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{invite.title}</h3>
          {invitation && inviteUrl ? (
            <>
              <CopyLink value={inviteUrl} label={invite.title} />
              <div>
                <ConfirmAction
                  action={revokeInvitation.bind(null, projectId, invitation.id)}
                  label={invite.revoke}
                  title={invite.revokeTitle}
                  description={invite.revokeDescription}
                />
              </div>
            </>
          ) : (
            <form action={createInvitation.bind(null, projectId)}>
              <Button type="submit" variant="outline" size="sm">
                {invite.generate}
              </Button>
            </form>
          )}
        </div>

        {participants.length > 0 && (
          <ul className="divide-y">
            {participants.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 text-sm wrap-break-word">{member.display_name}</span>
                <div className="flex flex-wrap gap-2">
                  {member.isGuest && <GuestLinkAction action={rotateGuestLink.bind(null, projectId, member.id)} />}
                  <ConfirmAction
                    action={removeMember.bind(null, projectId, member.id)}
                    label={manage.remove}
                    title={manage.removeTitle}
                    description={manage.removeDescription}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div>
          {status === "archived" ? (
            <form action={setProjectStatus.bind(null, projectId, "active")}>
              <Button type="submit" variant="outline" size="sm">
                {manage.reopen}
              </Button>
            </form>
          ) : (
            <ConfirmAction
              action={setProjectStatus.bind(null, projectId, "archived")}
              label={manage.archive}
              title={manage.archiveTitle}
              description={manage.archiveDescription}
            />
          )}
        </div>
      </div>
    </details>
  );
}
