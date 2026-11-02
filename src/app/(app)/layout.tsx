import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2 md:px-8">
        <Link href="/dashboard" className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <ThemeToggle />
          <Suspense>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
