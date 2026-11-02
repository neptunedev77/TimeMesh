"use client";

import { ArrowRight } from "lucide-react";
import { FormFeedback } from "@/components/forms/form-feedback";
import { type FormState, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messages } from "@/i18n";

const copy = messages.dashboard;

export function QuickCreate({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const { state, isPending, formProps } = useActionForm(action, {});

  return (
    <form {...formProps} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          name="name"
          required
          maxLength={120}
          autoComplete="off"
          aria-label={copy.nameLabel}
          placeholder={copy.namePlaceholder}
          className="h-12 flex-1 rounded-xl px-4 text-base"
        />
        <Button type="submit" disabled={isPending} className="h-12 gap-2 rounded-xl px-5">
          {isPending ? messages.join.pending : copy.create}
          {!isPending && <ArrowRight aria-hidden="true" />}
        </Button>
      </div>
      <FormFeedback state={state} />
    </form>
  );
}
