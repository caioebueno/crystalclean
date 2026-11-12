import { NextResponse } from "next/server";

/** STUB: out-of-area waitlist. Wire to the same lead delivery as /api/quote. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.zip) return NextResponse.json({ ok: false }, { status: 400 });
  console.log("[waitlist]", JSON.stringify({ receivedAt: new Date().toISOString(), zip: body.zip, email: body.email }));
  return NextResponse.json({ ok: true });
}
