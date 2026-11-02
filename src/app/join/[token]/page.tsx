import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { joinProjectAsGuest, joinProjectAsUser } from "@/app/join/actions";
import { InvalidLink, PublicCard, PublicShell } from "@/components/layout/public-shell";
import { JoinAsUserForm, NameForm } from "@/components/projects/join-forms";
import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/i18n";
import { getOptionalUser } from "@/lib/auth/session";
import { getInvitedProject, listActiveMemberNames } from "@/lib/projects/membership";
import { createAdminClient } from "@/lib/supabase/admin";

const { join } = messages;

export const metadata: Metadata = { robots: { index: false } };

async function JoinContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const project = await getInvitedProject(admin, token);
  if (!project) return <InvalidLink title={join.invalidTitle} description={join.invalidDescription} />;

  const [user, members] = await Promise.all([getOptionalUser(), listActiveMemberNames(admin, project.id)]);
  const hostName = members.find(({ role }) => role === "host")?.display_name;
  const next = encodeURIComponent(`/join/${token}`);

  return (
    <PublicCard>
      <p className="text-sm text-muted-foreground">{join.title}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight wrap-break-word">{project.name}</h1>
      {hostName && (
        <p className="mt-1 text-sm text-muted-foreground">
          {join.host} {hostName}
        </p>
      )}
      <div className="mt-6">
        {user ? (
          <JoinAsUserForm action={joinProjectAsUser.bind(null, token)} name={user.displayName} />
        ) : project.allow_guests ? (
          <div className="flex flex-col gap-4">
            <NameForm
              action={joinProjectAsGuest.bind(null, token)}
              label={join.name}
              submitLabel={join.submit}
              stretch
            />
            <p className="text-sm text-muted-foreground">
              {join.noAccountNeeded} {join.haveAccount}{" "}
              <Link href={`/login?next=${next}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {join.login}
              </Link>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p>{join.accountRequired}</p>
            <Link href={`/login?next=${next}`} className={`${buttonVariants()} h-11`}>
              {join.login}
            </Link>
            <Link href={`/register?next=${next}`} className={`${buttonVariants({ variant: "outline" })} h-11`}>
              {join.register}
            </Link>
          </div>
        )}
      </div>
    </PublicCard>
  );
}

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <PublicShell>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" aria-hidden="true" />}>
        <JoinContent params={params} />
      </Suspense>
    </PublicShell>
  );
}
