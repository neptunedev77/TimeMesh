"use client";

import { Moon, Sun } from "lucide-react";
import { messages } from "@/i18n";

export function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // Without storage the choice just lasts until the page reloads.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={messages.theme.toggle}
      title={messages.theme.toggle}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
    </button>
  );
}
