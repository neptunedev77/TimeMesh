import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="mb-6">
        <Logo />
      </Link>
      <main className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</main>
    </div>
  );
}
