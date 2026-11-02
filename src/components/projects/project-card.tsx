import Link from "next/link";
import { messages } from "@/i18n";
import type { ProjectSummary } from "@/lib/projects/queries";

const { dashboard } = messages;

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-xs transition-all duration-200 outline-none hover:-translate-y-0.5 hover:border-mesh-3 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <h3 className="min-w-0 font-medium wrap-break-word">{project.name}</h3>
      <span className="shrink-0 text-sm text-muted-foreground">
        {project.participantCount} {project.participantCount === 1 ? dashboard.participant : dashboard.participants}
      </span>
    </Link>
  );
}

export function ProjectGrid({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
