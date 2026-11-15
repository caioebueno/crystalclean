"use server";

import { isAdmin } from "@/lib/adminAuth";
import { bookFromAdmin, cleanCustomer, loadOps, saveCustomer } from "@/lib/opsStore";
import type { OpsCustomer } from "@/lib/ops";

const signedOut = { ok: false as const, error: "You were signed out. Sign in again at /admin." };

export async function saveCustomerAction(body: unknown): Promise<{ ok: true; customer: OpsCustomer } | { ok: false; error: string; customer?: OpsCustomer }> {
  if (!(await isAdmin())) return signedOut;
  const c = cleanCustomer(body);
  if (typeof c === "string") return { ok: false, error: c };
  try {
    const r = await saveCustomer(c);
    if (!r.ok) return { ok: false, error: "This customer changed somewhere else. Showing the latest, try again.", customer: r.customer };
    return r;
  } catch (e) {
    console.error("[customer] save failed", e);
    return { ok: false, error: "Could not save. Check your connection and try again." };
  }
}

/** Mark a pending booking link as booked (the customer answered by text), then reload everything. */
export async function bookPendingAction(linkId: string, optionId: string): Promise<{ ok: true; customers: OpsCustomer[] } | { ok: false; error: string }> {
  if (!(await isAdmin())) return signedOut;
  try {
    const err = await bookFromAdmin(String(linkId), String(optionId));
    if (err) return { ok: false, error: err };
    return { ok: true, customers: (await loadOps()).customers };
  } catch (e) {
    console.error("[customer] book failed", e);
    return { ok: false, error: "Could not mark it as booked. Try again." };
  }
}
