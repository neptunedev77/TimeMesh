"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, useActionState } from "react";
import type { AuthFormState } from "@/app/(auth)/actions";
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
  const [state, formAction, isPending] = useActionState(action, {});
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const error =
    state.error ?? (searchParams.get("error") === "link" ? messages.auth.errors.linkFailed : undefined);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        // React clears a form after its action runs; this keeps what people typed if it fails.
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="flex flex-col gap-4"
    >
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
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          {state.success}
        </p>
      )}
      <Button type="submit" size="lg" disabled={isPending} className="mt-2 h-11 md:h-10">
        {isPending ? messages.auth.pending : submitLabel}
      </Button>
    </form>
  );
}
