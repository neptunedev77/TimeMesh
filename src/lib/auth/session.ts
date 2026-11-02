import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  displayName: string;
};

/** Verifies the session with Supabase. Pages and actions must rely on this, not on the proxy. */
export const getOptionalUser = cache(async (): Promise<CurrentUser | null> => {
  // The Supabase client reads the clock, so this must only ever run at request time.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return profile ? { id: user.id, displayName: profile.display_name } : null;
});

export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
