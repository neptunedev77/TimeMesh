import { register } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPage } from "@/components/auth/auth-page";
import { messages } from "@/i18n";

const { fields, register: copy } = messages.auth;

export default function RegisterPage() {
  return (
    <AuthPage
      title={copy.title}
      description={copy.description}
      switchText={copy.switchText}
      switchLink={copy.switchLink}
      switchHref="/login"
    >
      <AuthForm
        action={register}
        submitLabel={copy.submit}
        fields={[
          { name: "name", label: fields.name, type: "text", autoComplete: "name" },
          { name: "email", label: fields.email, type: "email", autoComplete: "email" },
          { name: "password", label: fields.password, type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthPage>
  );
}
