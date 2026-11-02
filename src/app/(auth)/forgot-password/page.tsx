import { requestPasswordReset } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPage } from "@/components/auth/auth-page";
import { messages } from "@/i18n";

const { fields, forgot: copy } = messages.auth;

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title={copy.title}
      description={copy.description}
      switchText={copy.switchText}
      switchLink={copy.switchLink}
      switchHref="/login"
    >
      <AuthForm
        action={requestPasswordReset}
        submitLabel={copy.submit}
        fields={[{ name: "email", label: fields.email, type: "email", autoComplete: "email" }]}
      />
    </AuthPage>
  );
}
