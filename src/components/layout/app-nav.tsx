"use client";

import { CalendarCheck, CalendarClock, FolderKanban, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { messages } from "@/i18n";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: messages.nav.dashboard, icon: LayoutDashboard },
  { href: "/projects", label: messages.nav.projects, icon: FolderKanban },
  { href: "/availability", label: messages.nav.availability, icon: CalendarClock },
  { href: "/sessions", label: messages.nav.sessions, icon: CalendarCheck },
  { href: "/settings", label: messages.nav.settings, icon: Settings },
];

export function AppNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const isSidebar = variant === "sidebar";

  return (
    <nav aria-label={messages.nav.label}>
      <ul className={cn(isSidebar ? "flex flex-col gap-1" : "grid grid-cols-5")}>
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSidebar
                    ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium"
                    : "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium",
                  isActive
                    ? isSidebar
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
