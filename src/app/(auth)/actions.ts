"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { messages } from "@/i18n";
import { safeRedirectPath } from "@/lib/auth/redirect";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: string;
};

const { errors, success } = messages.auth;

function errorMessage(error: { status?: number }, fallback: string) {
  return error.status === 429 ? errors.rateLimited : fallback;
}

function validationError(error: { issues: { message: string }[] }): AuthFormState {
  return { error: error.issues[0]?.message ?? errors.generic };
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: errorMessage(error, errors.invalidLogin) };

  redirect(safeRedirectPath(formData.get("next")));
}

export async function register(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const { name, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  });
  if (error) return { error: errorMessage(error, errors.registerFailed) };
  if (!data.session) return { success: success.confirmEmail };

  redirect(safeRedirectPath(formData.get("next")));
}

export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // The same answer either way, so this form can't reveal who has an account.
  if (error?.status === 429) return { error: errors.rateLimited };
  return { success: success.resetSent };
}

export async function resetPassword(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: errorMessage(error, errors.resetFailed) };

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}
