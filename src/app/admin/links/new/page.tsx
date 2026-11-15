import type { Metadata } from "next";
import { AdminShell, requireAdmin } from "@/components/booking/AdminShell";
import { LinkForm } from "@/components/booking/LinkForm";
import { autoName, blankCustomer, blankInput, fromQuote, newOpt, type LinkInput } from "@/lib/booking";
import { getLink, quoteToPick } from "@/lib/bookingStore";
import { fullName, type OpsCustomer } from "@/lib/ops";
import { getCustomer } from "@/lib/opsStore";
import { listSubmissions } from "@/lib/submissions";
import { saveLinkAction } from "../actions";

export const metadata: Metadata = { title: "New booking link", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewLinkPage({ searchParams }: { searchParams: Promise<{ from?: string; dup?: string; customer?: string }> }) {
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
  if (sp.customer) {
    const c = await getCustomer(sp.customer);
    if (c) initial = fromCustomer(c);
  }
  return (
    <AdminShell tab="links">
      <LinkForm quotes={quotes} initial={initial} save={saveLinkAction} />
    </AdminShell>
  );
}

/** A renewal link for a customer from the Customers tab: their details and current plan as the first option. */
function fromCustomer(c: OpsCustomer): LinkInput {
  const base = blankInput();
  const p = c.plan;
  const opt = newOpt();
  if (p) {
    opt.type = p.type;
    opt.freq = p.freq === "monthly" ? "fourweek" : p.freq;
    opt.term = p.type === "once" ? "3" : p.term;
    opt.price = p.price;
    opt.name = autoName(opt);
  }
  return {
    ...base,
    qid: c.qid ?? "",
    cust: {
      ...blankCustomer(),
      name: fullName(c),
      phone: c.phone,
      email: c.email,
      addr: c.addr,
      addrNotes: c.addrNotes,
      type: c.type,
      beds: c.beds,
      baths: c.baths || 1,
      size: c.size || blankCustomer().size,
      last: c.lastClean || blankCustomer().last,
      extras: c.extras,
      notes: c.quoteNotes,
    },
    ...(p ? { win: p.win, cStart: p.t, cEnd: endOf(p.t) } : {}),
    options: [opt],
    msg: `Hi ${c.first}! Here's your price to keep your cleans going. Pick the option that works for you and tap confirm.`,
  };
}

const endOf = (t: string) => {
  const [h, m] = (t || "13:00").split(":").map(Number);
  return `${String(Math.min(23, h + 3)).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
};
