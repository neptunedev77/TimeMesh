import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Link href="/" className="mb-6">
        <Logo />
      </Link>
      <main className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</main>
    </div>
  );
}
