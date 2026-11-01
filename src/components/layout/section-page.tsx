import type { LucideIcon } from "lucide-react";

type SectionPageProps = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
};

export function SectionPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon: Icon,
}: SectionPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </header>
      <section className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-mesh-1 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-medium">{emptyTitle}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
      </section>
    </div>
  );
}
