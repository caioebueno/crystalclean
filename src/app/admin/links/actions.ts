"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/adminAuth";
import { cleanInput, getLink, putLink, saveLink } from "@/lib/bookingStore";

export async function saveLinkAction(body: unknown, editingId?: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: "You were signed out. Sign in again at /admin." };
  const input = cleanInput(body);
  if (typeof input === "string") return { ok: false, error: input };
  try {
    const link = await saveLink(input, editingId || undefined);
    revalidatePath("/admin/links");
    return { ok: true, id: link.id };
  } catch (e) {
    console.error("[booking-link] save failed", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the link." };
  }
}

export async function cancelLinkAction(id: string) {
  if (!(await isAdmin())) return { ok: false };
  const l = await getLink(id);
  if (!l || l.status === "cancelled") return { ok: false };
  await putLink({ ...l, status: "cancelled", prevStatus: l.status, updatedAt: new Date().toISOString() });
  revalidatePath("/admin/links");
  return { ok: true };
}

export async function undoCancelAction(id: string) {
  if (!(await isAdmin())) return { ok: false };
  const l = await getLink(id);
  if (!l || l.status !== "cancelled") return { ok: false };
  await putLink({ ...l, status: l.prevStatus ?? "sent", prevStatus: undefined, updatedAt: new Date().toISOString() });
  revalidatePath("/admin/links");
  return { ok: true };
}
