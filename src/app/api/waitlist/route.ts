import { after, NextResponse } from "next/server";
import { clean, saveSubmission } from "@/lib/submissions";
import { sendLeadAlert } from "@/lib/leadAlert";

/** Out-of-area waitlist. See signups at /admin. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.phone || !body?.zip) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const sub = await saveSubmission("waitlist", clean(body, ["zip", "phone"]));
    after(() => sendLeadAlert(sub));
  } catch (e) {
    console.error("[waitlist] could not save", e, JSON.stringify(body));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
