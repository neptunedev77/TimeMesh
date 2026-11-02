import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function PublicShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative flex flex-1 flex-col items-center px-4 py-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="mb-6">
        <Logo />
      </Link>
      <main className={cn("flex w-full flex-col gap-5", wide ? "max-w-6xl" : "max-w-md")}>{children}</main>
    </div>
  );
}

export function PublicCard({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6">{children}</section>;
}

export function InvalidLink({ title, description }: { title: string; description: string }) {
  return (
    <PublicCard>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </PublicCard>
  );
}
