import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, requireAdmin } from "@/components/booking/AdminShell";
import { CopyButton, CopyField } from "@/components/booking/LinkActions";
import { site } from "@/config/site";
import { dateLabel, e164, fmtPhone, money, shownStatus, tagFor, winLabels } from "@/lib/booking";
import { getLink } from "@/lib/bookingStore";

export const metadata: Metadata = { title: "Booking link", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmtWhen = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

export default async function LinkPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const l = await getLink(id);
  if (!l) notFound();
  const first = l.cust.name.trim().split(" ")[0] || "the customer";
  const url = `${site.url}/book/${l.id}`;
  const share = `${(l.msg || "").trim() ? l.msg.trim() + "\n" : ""}${url}`;
  const ph = e164(l.cust.phone);
  const st = shownStatus(l);
  const picked = l.options.find((o) => o.id === l.picked);
  const title = sp.created ? `${first}'s booking link is ready` : sp.saved ? "Changes saved" : `${first}'s booking link`;
  return (
    <AdminShell tab="links">
      <main className="wrap succ">
        <div className="card succ-c">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="32" cy="32" r="31" fill="#0E1F3D" />
              <path d="m20 33 8 8 16-17" fill="none" stroke="#C9A25E" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <h1 className="ptitle" style={{ fontSize: 36 }}>
                {title}
              </h1>
              <p className="psub" style={{ marginTop: 2 }}>
                {dateLabel(l.date, { weekday: "long", month: "short", day: "numeric" })} · {winLabels(l).short} · {l.options.length} {l.options.length === 1 ? "option" : "options"}
              </p>
            </div>
          </div>
          <div>
            <span className={`tag t-${st}`}>{tagFor(l)}</span>
          </div>
          {st === "booked" && picked && (
            <div className="booked-box">
              <b>
                {first} booked {picked.name} · {money(picked.price)}
                {picked.type === "plan" ? " per clean" : ""}
              </b>
              <span>
                {fmtWhen(l.bookedAt)} · text {fmtPhone(l.bookedPhone || l.cust.phone)}
                {l.textMe === false ? " (asked for no update texts)" : ""}
              </span>
            </div>
          )}
          <CopyField url={url} />
          {ph && (
            <a className="btn btn-lg btn-block" href={`sms:${ph}?&body=${encodeURIComponent(share)}`}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0E1F3D" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.3-4A8 8 0 1 1 20 12z" />
              </svg>
              Text it to {first}
            </a>
          )}
          <div className="bigs">
            <CopyButton text={url} label="Copy link" className="btn btn-out" />
            <a className="btn btn-out" href={`https://wa.me/${ph.replace(/^\+/, "")}?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener">
              WhatsApp
            </a>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, borderTop: "1px solid #E4DED3", paddingTop: 10 }}>
            <a className="linkbtn" href={`/book/${l.id}?preview=1`} target="_blank" rel="noopener">
              Open customer page
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0E1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </a>
            <Link className="linkbtn" href={`/admin/links/${l.id}/edit`}>
              Edit
            </Link>
            <Link className="linkbtn" href="/admin/links">
              See all booking links
            </Link>
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
