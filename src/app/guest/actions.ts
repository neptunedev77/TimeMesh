"use server";

import { getBoardMembers, saveWeek } from "@/lib/availability/store";
import { resolveGuest } from "@/lib/projects/membership";
import { createAdminClient } from "@/lib/supabase/admin";

// Each action identifies the guest from their token and only touches that guest's own member id.

export async function loadGuestBoard(token: string, week: string) {
  const admin = createAdminClient();
  const member = await resolveGuest(admin, token);
  if (!member) return { error: true as const };

  return { members: await getBoardMembers(admin, member.project.id, week, member.project) };
}

export async function saveGuestWeek(token: string, week: string, cells: string[]) {
  const admin = createAdminClient();
  const member = await resolveGuest(admin, token);
  if (!member) return { ok: false };

  return { ok: await saveWeek(admin, member.id, member.project, week, cells) };
}
