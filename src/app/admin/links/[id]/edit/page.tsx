import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell, requireAdmin } from "@/components/booking/AdminShell";
import { LinkForm } from "@/components/booking/LinkForm";
import { getLink, quoteToPick } from "@/lib/bookingStore";
import { listSubmissions } from "@/lib/submissions";
import { saveLinkAction } from "../../actions";

export const metadata: Metadata = { title: "Edit booking link", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const l = await getLink(id);
  if (!l) notFound();
  const quotes = (await listSubmissions().catch(() => [])).filter((s) => s.kind === "quote").map(quoteToPick);
  const initial = { qid: l.qid, cust: l.cust, date: l.date, win: l.win, cStart: l.cStart, cEnd: l.cEnd, options: l.options, sentBy: l.sentBy, msg: l.msg, expires: l.expires };
  return (
    <AdminShell tab="links">
      <LinkForm quotes={quotes} initial={initial} editing={{ id: l.id, booked: l.status === "booked" }} save={saveLinkAction} />
    </AdminShell>
  );
}
