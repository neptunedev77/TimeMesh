import { ArrowRight, Link2, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { WeekPreview } from "@/components/landing/week-preview";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/i18n";
import { cn } from "@/lib/utils";

const featureIcons = [Link2, Users, UsersRound];

export default function Home() {
  const { landing } = messages;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 md:px-8">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            {landing.login}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-16 py-10 md:py-16">
        <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {landing.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
              {landing.description}
            </p>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "lg" }), "mt-8 h-11 gap-2 px-5")}
            >
              {landing.cta}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <WeekPreview />
        </section>
        <ul className="grid gap-8 border-t pt-10 sm:grid-cols-3">
          {landing.features.map((feature, index) => {
            const Icon = featureIcons[index];

            return (
              <li key={feature.title}>
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h2 className="mt-3 font-medium">{feature.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
