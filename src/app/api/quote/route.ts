import { NextResponse } from "next/server";

/**
 * STUB: lead delivery is not wired up yet.
 * Replace the console.log with the chosen delivery (e.g. Formspree / email + Twilio text,
 * or a CRM like Jobber / Housecall Pro).
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const required = ["zip", "type", "size", "lastClean", "plan", "name", "phone", "address"];
  const missing = required.filter((k) => !body[k] || String(body[k]).trim() === "");
  if (missing.length) {
    return NextResponse.json({ ok: false, error: `Missing: ${missing.join(", ")}` }, { status: 400 });
  }

  console.log("[quote request]", JSON.stringify({ receivedAt: new Date().toISOString(), ...body }));
  return NextResponse.json({ ok: true });
}
