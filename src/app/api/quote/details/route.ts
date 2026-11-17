import { NextResponse } from "next/server";
import { clean, saveSubmission, updateSubmission } from "@/lib/submissions";

const FIELDS = ["size", "lastClean", "extras", "days", "timeOfDay", "address", "notes"];

/** Optional details sent after the quick lead. Added to the same submission. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!body || !id) return NextResponse.json({ ok: false }, { status: 400 });
  const extra = clean(body, FIELDS);
  if (!Object.keys(extra).length) return NextResponse.json({ ok: true });
  try {
    const found = await updateSubmission(id, extra);
    // Lead not found (e.g. memory storage was reset): keep the details as their own request so nothing is lost.
    if (!found) await saveSubmission("quote", { ...clean(body, ["zip", "type", "bedrooms", "bathrooms", "name", "phone"]), ...extra, notes: [extra.notes, "(details sent separately)"].filter(Boolean).join(" ") });
  } catch (e) {
    console.error("[quote details] could not save", e, JSON.stringify(body));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
