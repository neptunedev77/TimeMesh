import { resetPassword } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPage } from "@/components/auth/auth-page";
import { messages } from "@/i18n";

const { fields, reset: copy } = messages.auth;

export default function ResetPasswordPage() {
  return (
    <AuthPage
      title={copy.title}
      description={copy.description}
      switchText={copy.switchText}
      switchLink={copy.switchLink}
      switchHref="/forgot-password"
    >
      <AuthForm
        action={resetPassword}
        submitLabel={copy.submit}
        fields={[
          { name: "password", label: fields.newPassword, type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthPage>
  );
}
