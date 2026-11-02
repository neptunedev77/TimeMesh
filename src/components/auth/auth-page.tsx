import Link from "next/link";
import { type ReactNode, Suspense } from "react";

type AuthPageProps = {
  title: string;
  description: string;
  switchText: string;
  switchLink: string;
  switchHref: string;
  extra?: ReactNode;
  children: ReactNode;
};

export function AuthPage({
  title,
  description,
  switchText,
  switchLink,
  switchHref,
  extra,
  children,
}: AuthPageProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 mb-6 text-muted-foreground">{description}</p>
      {/* The form reads the URL's query string, which is only known at request time. */}
      <Suspense>{children}</Suspense>
      {extra}
      <p className="mt-6 text-sm text-muted-foreground">
        {switchText}{" "}
        <Link href={switchHref} className="font-medium text-primary underline-offset-4 hover:underline">
          {switchLink}
        </Link>
      </p>
    </>
  );
}
