import { NextResponse } from "next/server";
import { clean, saveSubmission } from "@/lib/submissions";

const FIELDS = ["zip", "type", "bedrooms", "bathrooms", "size", "lastClean", "plan", "extras", "days", "timeOfDay", "name", "phone", "address", "notes"];

/** Saves a quote request. See them at /admin. */
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

  try {
    await saveSubmission("quote", clean(body, FIELDS));
  } catch (e) {
    console.error("[quote] could not save", e, JSON.stringify(body));
    return NextResponse.json({ ok: false, error: "Could not save" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
