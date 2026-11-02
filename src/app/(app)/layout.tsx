import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import { Suspense } from "react";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/logo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-8 border-r bg-sidebar p-4 md:flex">
        <Link href="/" className="px-3 py-1">
          <Logo />
        </Link>
        <AppNav variant="sidebar" />
        <div className="mt-auto px-1">
          <Suspense>
            <UserMenu />
          </Suspense>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col pb-14 md:pb-0">
        <header className="flex items-center justify-between gap-4 border-b px-4 py-2 md:hidden">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>
          <Suspense>
            <UserMenu />
          </Suspense>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background md:hidden">
        <AppNav variant="bottom" />
      </div>
    </div>
  );
}
