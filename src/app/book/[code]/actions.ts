"use server";

import { digits, shownStatus, toPublic, type PublicLink } from "@/lib/booking";
import { getLink, putLink } from "@/lib/bookingStore";
import { importBookedLink } from "@/lib/opsStore";

/** Called by the page once it is open in a browser (link previews in text apps don't count). */
export async function markViewed(code: string) {
  const l = await getLink(code);
  if (!l || l.status !== "sent" || shownStatus(l) === "expired") return;
  await putLink({ ...l, status: "viewed", viewedAt: new Date().toISOString() });
}

export async function confirmBooking(
  code: string,
  optionId: string,
  phone: string,
  textMe: boolean,
): Promise<{ ok: true; link: PublicLink } | { ok: false; error: string; link?: PublicLink }> {
  const l = await getLink(code);
  if (!l) return { ok: false, error: "We couldn't find this booking link. Text us and we'll help." };
  const st = shownStatus(l);
  if (st === "booked") return { ok: true, link: toPublic(l) };
  if (st === "expired" || st === "cancelled") return { ok: false, error: "This link is no longer active.", link: toPublic(l) };
  if (!l.options.some((o) => o.id === optionId)) return { ok: false, error: "Please choose one of the options." };
  if (digits(phone).length < 10) return { ok: false, error: "Please add a mobile number for your confirmation." };
  const booked = {
    ...l,
    status: "booked" as const,
    picked: optionId,
    bookedAt: new Date().toISOString(),
    bookedPhone: String(phone).trim().slice(0, 40),
    textMe: !!textMe,
    viewedAt: l.viewedAt ?? new Date().toISOString(),
  };
  await putLink(booked);
  // Put the customer and all their visits on the admin calendar. Never blocks the customer's booking.
  await importBookedLink(booked).catch((e) => console.error("[customer] import failed for link", l.id, e));
  console.log(`[booking] ${l.cust.name} booked ${l.options.find((o) => o.id === optionId)?.name} for ${l.date} (${l.id})`);
  return { ok: true, link: toPublic(booked) };
}
