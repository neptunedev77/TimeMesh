import type { FormState } from "./use-action-form";

export function FormFeedback({ state, error }: { state: FormState; error?: string }) {
  const message = state.error ?? error;

  return (
    <>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          {state.success}
        </p>
      )}
    </>
  );
}
