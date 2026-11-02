"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/forms/use-action-form";
import { messages } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { joinAsGuest, joinAsUser } from "@/lib/projects/membership";
import { displayNameSchema } from "@/lib/projects/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

const { join } = messages;

export async function joinProjectAsGuest(
  token: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = displayNameSchema.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0]?.message ?? join.failed };

  const result = await joinAsGuest(createAdminClient(), token, name.data);
  if (!result.ok) {
    return { error: result.reason === "failed" ? join.failed : join.invalidDescription };
  }

  redirect(`/guest/${result.guestToken}`);
}

export async function joinProjectAsUser(token: string): Promise<FormState> {
  const user = await getCurrentUser();
  const result = await joinAsUser(createAdminClient(), token, user);

  if (!result.ok) {
    if (result.reason === "removed") return { error: join.removed };
    return { error: result.reason === "failed" ? join.failed : join.invalidDescription };
  }

  redirect(`/projects/${result.projectId}`);
}
