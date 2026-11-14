import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireAdmin } from "@/components/booking/AdminShell";
import { RowActions, UndoToast } from "@/components/booking/LinkActions";
import { site } from "@/config/site";
import { dateLabel, optSummary, shownStatus, tagFor, winLabels, type BookingLink } from "@/lib/booking";
import { listLinks } from "@/lib/bookingStore";
import { storageConfigured } from "@/lib/submissions";
import { cancelLinkAction, undoCancelAction } from "./actions";

export const metadata: Metadata = { title: "Booking links", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LinksPage({ searchParams }: { searchParams: Promise<{ undo?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  let links: BookingLink[] = [];
  let loadErr = "";
  try {
    links = await listLinks();
  } catch (e) {
    loadErr = e instanceof Error ? e.message : "Could not load booking links.";
  }
  const undone = sp.undo ? links.find((l) => l.id === sp.undo && l.status === "cancelled") : undefined;
  return (
    <AdminShell tab="links">
      <main className="wrap">
        <div className="phead">
          <div>
            <h1 className="ptitle">Booking links</h1>
            <p className="psub">Personal links you&apos;ve texted to customers.</p>
          </div>
          <Link className="btn" href="/admin/links/new">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0E1F3D" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New booking link
          </Link>
        </div>
        <div className="lgrid">
          {!storageConfigured && <div className="warn">No database connected, so booking links are only kept until the server restarts. Add REDIS_URL in Vercel.</div>}
          {loadErr && <div className="warn">{loadErr}</div>}
          {undone && <UndoToast id={undone.id} name={undone.cust.name} undo={undoCancelAction} />}
          {!links.length && !loadErr && <p className="psub">No booking links yet. Open a quote request in Submissions and tap &quot;Create booking link&quot;.</p>}
          {links.map((l) => {
            const st = shownStatus(l);
            return (
              <article key={l.id} className="card lrow">
                <div style={{ minWidth: 0 }}>
                  <div className="lname">{l.cust.name}</div>
                  <div className="lmeta">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5B6474" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
                    </svg>
                    {dateLabel(l.date)} · {winLabels(l).short}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start", minWidth: 0 }}>
                  <div className="lopts">{optSummary(l)}</div>
                  <span className={`tag t-${st}`}>{tagFor(l)}</span>
                </div>
                <RowActions row={{ id: l.id, name: l.cust.name, url: `${site.url}/book/${l.id}`, canCancel: st !== "cancelled" && st !== "expired" }} cancel={cancelLinkAction} />
              </article>
            );
          })}
        </div>
      </main>
    </AdminShell>
  );
}
