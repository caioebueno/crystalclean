import { NextResponse } from "next/server";
import { clean, saveSubmission } from "@/lib/submissions";

const FIELDS = ["zip", "type", "bedrooms", "bathrooms", "plan", "priceShown", "offer", "name", "phone", "source"];

/**
 * Saves a quick quote request (the lead): ZIP, home type, bedrooms, bathrooms, name and mobile.
 * The optional details come later through /api/quote/details. See them at /admin.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const required = ["zip", "type", "name", "phone"];
  const missing = required.filter((k) => !body[k] || String(body[k]).trim() === "");
  if (missing.length) {
    return NextResponse.json({ ok: false, error: `Missing: ${missing.join(", ")}` }, { status: 400 });
  }

  try {
    const sub = await saveSubmission("quote", clean(body, FIELDS));
    return NextResponse.json({ ok: true, id: sub.id });
  } catch (e) {
    console.error("[quote] could not save", e, JSON.stringify(body));
    return NextResponse.json({ ok: false, error: "Could not save" }, { status: 500 });
  }
}
