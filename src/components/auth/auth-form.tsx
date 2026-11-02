"use client";

import { useSearchParams } from "next/navigation";
import type { AuthFormState } from "@/app/(auth)/actions";
import { FormFeedback } from "@/components/forms/form-feedback";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { messages } from "@/i18n";

type Field = {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
};

type AuthFormProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: Field[];
  submitLabel: string;
};

export function AuthForm({ action, fields, submitLabel }: AuthFormProps) {
  const { state, isPending, formProps } = useActionForm(action, {});
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const linkError = searchParams.get("error") === "link" ? messages.auth.errors.linkFailed : undefined;

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            className="h-11 md:h-10"
          />
        </div>
      ))}
      <FormFeedback state={state} error={linkError} />
      <Button type="submit" size="lg" disabled={isPending} className="mt-2 h-11 md:h-10">
        {isPending ? messages.auth.pending : submitLabel}
      </Button>
    </form>
  );
}
