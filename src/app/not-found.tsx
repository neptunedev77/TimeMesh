import Link from "next/link";
import { InvalidLink, PublicShell } from "@/components/layout/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/i18n";

export default function NotFound() {
  return (
    <PublicShell>
      <InvalidLink title={messages.notFound.title} description={messages.notFound.description} />
      <Link href="/dashboard" className={`${buttonVariants({ variant: "outline" })} h-10 self-center px-4`}>
        {messages.notFound.back}
      </Link>
    </PublicShell>
  );
}
