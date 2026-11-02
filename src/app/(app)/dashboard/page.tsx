import { Suspense } from "react";
import { createProject } from "@/app/(app)/projects/actions";
import { QuickCreate } from "@/components/board/quick-create";
import { PageSkeleton } from "@/components/layout/page-header";
import { ProjectGrid } from "@/components/projects/project-card";
import { messages } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyProjects } from "@/lib/projects/queries";

const { dashboard } = messages;

async function ProjectLists() {
  const user = await getCurrentUser();
  const projects = await getMyProjects(user.id);
  const current = projects.filter(({ status }) => status !== "archived");
  const archived = projects.filter(({ status }) => status === "archived");

  return (
    <>
      {current.length > 0 ? (
        <ProjectGrid projects={current} />
      ) : (
        <div className="py-8 text-center">
          <p className="font-medium">{dashboard.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{dashboard.emptyDescription}</p>
        </div>
      )}
      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">{dashboard.archived}</h2>
          <ProjectGrid projects={archived} />
        </section>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:py-14">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{dashboard.title}</h1>
      <QuickCreate action={createProject} />
      <Suspense fallback={<PageSkeleton />}>
        <ProjectLists />
      </Suspense>
    </div>
  );
}
