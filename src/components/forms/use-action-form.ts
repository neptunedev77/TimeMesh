"use client";

import { type FormEvent, startTransition, useActionState } from "react";

export type FormState = {
  error?: string;
  success?: string;
};

/** Runs a server action from a form, keeping what people typed if it fails. */
export function useActionForm(
  action: (state: FormState, formData: FormData) => Promise<FormState>,
  initialState: FormState,
) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return {
    state,
    isPending,
    formProps: {
      action: formAction,
      // React clears a form after its action runs, unless the action is started by hand.
      onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      },
    },
  };
}
