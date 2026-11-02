import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight wrap-break-word md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      {children}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <PageContainer>
      <div className="flex animate-pulse flex-col gap-4" aria-hidden="true">
        <div className="h-9 w-56 rounded-lg bg-muted" />
        <div className="h-96 rounded-2xl bg-muted" />
      </div>
    </PageContainer>
  );
}
