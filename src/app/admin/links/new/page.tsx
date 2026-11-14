import type { Metadata } from "next";
import { AdminShell, requireAdmin } from "@/components/booking/AdminShell";
import { LinkForm } from "@/components/booking/LinkForm";
import { blankInput, fromQuote } from "@/lib/booking";
import { getLink, quoteToPick } from "@/lib/bookingStore";
import { listSubmissions } from "@/lib/submissions";
import { saveLinkAction } from "../actions";

export const metadata: Metadata = { title: "New booking link", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewLinkPage({ searchParams }: { searchParams: Promise<{ from?: string; dup?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const quotes = (await listSubmissions().catch(() => [])).filter((s) => s.kind === "quote").map(quoteToPick);
  let initial = blankInput();
  const q = sp.from ? quotes.find((x) => x.qid === sp.from) : undefined;
  if (q) initial = fromQuote(q);
  if (sp.dup) {
    const l = await getLink(sp.dup);
    if (l) initial = { qid: l.qid, cust: l.cust, date: "", win: l.win, cStart: l.cStart, cEnd: l.cEnd, options: l.options, sentBy: l.sentBy, msg: l.msg, expires: l.expires };
  }
  return (
    <AdminShell tab="links">
      <LinkForm quotes={quotes} initial={initial} save={saveLinkAction} />
    </AdminShell>
  );
}
