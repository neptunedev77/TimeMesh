"use client";

import { FormFeedback } from "@/components/forms/form-feedback";
import { type FormState, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { messages } from "@/i18n";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/** A single-name form, used to join as a guest and later to rename yourself. */
export function NameForm({
  action,
  label,
  submitLabel,
  defaultValue,
  stretch,
}: {
  action: Action;
  label: string;
  submitLabel: string;
  defaultValue?: string;
  stretch?: boolean;
}) {
  const { state, isPending, formProps } = useActionForm(action, {});

  return (
    <form {...formProps} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{label}</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          autoComplete="name"
          defaultValue={defaultValue}
          className="h-11 md:h-10"
        />
      </div>
      <FormFeedback state={state} />
      <Button type="submit" disabled={isPending} className={stretch ? "h-11" : "h-10 self-start px-4"}>
        {isPending ? messages.join.pending : submitLabel}
      </Button>
    </form>
  );
}

export function JoinAsUserForm({ action, name }: { action: Action; name: string }) {
  const { state, isPending, formProps } = useActionForm(action, {});

  return (
    <form {...formProps} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {messages.join.joinAs} <span className="font-medium text-foreground">{name}</span>
      </p>
      <FormFeedback state={state} />
      <Button type="submit" disabled={isPending} className="h-11">
        {isPending ? messages.join.pending : messages.join.submit}
      </Button>
    </form>
  );
}
