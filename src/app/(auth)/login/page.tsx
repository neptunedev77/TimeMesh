import Link from "next/link";
import { login } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPage } from "@/components/auth/auth-page";
import { messages } from "@/i18n";

const { fields, login: copy } = messages.auth;

export default function LoginPage() {
  return (
    <AuthPage
      title={copy.title}
      description={copy.description}
      switchText={copy.switchText}
      switchLink={copy.switchLink}
      switchHref="/register"
      extra={
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {copy.forgot}
        </Link>
      }
    >
      <AuthForm
        action={login}
        submitLabel={copy.submit}
        fields={[
          { name: "email", label: fields.email, type: "email", autoComplete: "email" },
          { name: "password", label: fields.password, type: "password", autoComplete: "current-password" },
        ]}
      />
    </AuthPage>
  );
}
