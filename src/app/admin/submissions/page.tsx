import type { Metadata } from "next";
import Link from "next/link";
import { listSubmissions, storageConfigured, type Submission } from "@/lib/submissions";
import { AdminShell, requireAdmin } from "@/components/booking/AdminShell";
import { tagFor, type BookingLink } from "@/lib/booking";
import { listLinks } from "@/lib/bookingStore";
import { DEFAULT_STAGES, effectiveState, loadPipeline, loadStages, type PipeState, type StageDef } from "@/lib/pipeline";
import { SubmissionsBoard } from "@/components/submissions/SubmissionsBoard";
import type { BoardLead } from "@/components/submissions/types";
import "../admin.css";

export const metadata: Metadata = { title: "Submissions", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  type: "Type",
  zip: "ZIP",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  priceShown: "Price shown",
  offer: "Page",
  source: "Ad",
  size: "Size",
  lastClean: "Last clean",
  plan: "Plan",
  extras: "Extras",
  days: "Days",
  timeOfDay: "Time of day",
  notes: "Notes",
};

const digits = (p: string) => p.replace(/\D/g, "");
const e164 = (p: string) => {
  const d = digits(p);
  return d.length === 10 ? `1${d}` : d;
};
const fmtPhone = (p: string) => {
  const d = digits(p).replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
};
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
const val = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(", ") : v ?? "");

function Card({ s, link }: { s: Submission; link?: BookingLink }) {
  const d = s.data;
  const phone = val(d.phone);
  const isQuote = s.kind === "quote";
  const title = isQuote ? val(d.name) || "Quote request" : "Waitlist signup";
  const tag = isQuote ? (val(d.type) === "rental" ? "Rental quote" : "Home quote") : "Waitlist";
  return (
    <article className="sub" id={`r-${s.id}`}>
      <header>
        <div>
          <span className={`tag tag-${isQuote ? (val(d.type) === "rental" ? "rental" : "home") : "wait"}`}>{tag}</span>
          <h2>{title}</h2>
        </div>
        <time dateTime={s.receivedAt}>{fmtDate(s.receivedAt)}</time>
      </header>
      {phone && (
        <div className="contact">
          <span className="ph">{fmtPhone(phone)}</span>
          <a href={`tel:+${e164(phone)}`}>Call</a>
          <a href={`sms:+${e164(phone)}`}>Text</a>
          <a href={`https://wa.me/${e164(phone)}`} target="_blank" rel="noopener">
            WhatsApp
          </a>
        </div>
      )}
      {d.address && (
        <p className="addr">
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${val(d.address)} ${val(d.zip)}`)}`} target="_blank" rel="noopener">
            {val(d.address)}
          </a>
        </p>
      )}
      <dl>
        {Object.keys(LABELS)
          .filter((k) => d[k] !== undefined && val(d[k]) !== "" && !(k === "type" && isQuote))
          .map((k) => (
            <div key={k} className={k === "notes" ? "wide" : ""}>
              <dt>{LABELS[k]}</dt>
              <dd>{k === "type" ? (val(d[k]) === "rental" ? "Vacation rental" : "Home") : val(d[k])}</dd>
            </div>
          ))}
      </dl>
      {isQuote && (
        <div className="mklink">
          {link ? (
            <>
              <Link href={`/admin/links/${link.id}`} className="linkpill">
                Booking link · {tagFor(link)}
              </Link>
              <Link href={`/admin/links/new?from=${s.id}`} className="ghostpill">
                New booking link
              </Link>
            </>
          ) : (
            <Link href={`/admin/links/new?from=${s.id}`} className="ghostpill">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0E1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
              </svg>
              Create booking link
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

function toLead(stages: StageDef[], s: Submission, link: BookingLink | undefined, saved: PipeState | undefined): BoardLead {
  const d = s.data;
  const phone = val(d.phone);
  const zip = val(d.zip);
  const beds = val(d.bedrooms);
  const baths = val(d.bathrooms);
  const rental = val(d.type) === "rental";
  const src = val(d.source) || "Website";
  const home = [rental ? "Rental" : "Home", zip && `ZIP ${zip}`, beds && (beds === "Studio" ? "Studio" : `${beds} bed`), baths && `${baths} bath`].filter(Boolean).join(" · ");
  const rows: BoardLead["rows"] = [
    { k: "Received", v: fmtDate(s.receivedAt) },
    ...(phone ? [{ k: "Mobile", v: fmtPhone(phone) }] : []),
    { k: "Home", v: rental ? "Vacation rental" : "Home" },
    ...Object.keys(LABELS)
      .filter((k) => k !== "type" && d[k] !== undefined && val(d[k]) !== "")
      .map((k) => ({ k: LABELS[k], v: val(d[k]) })),
  ];
  return {
    id: s.id,
    name: val(d.name) || "Quote request",
    phone,
    e164: e164(phone),
    phoneFmt: fmtPhone(phone),
    receivedAt: s.receivedAt,
    src,
    home,
    price: val(d.priceShown),
    address: val(d.address) ? `${val(d.address)} ${zip}`.trim() : "",
    zip,
    rows,
    link: link ? { id: link.id, tag: tagFor(link), customerId: link.customerId } : undefined,
    saved: saved ?? null,
    state: effectiveState(stages, saved, link, s.receivedAt),
  };
}

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ show?: string; open?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;

  let subs: Submission[] = [];
  let loadErr = "";
  try {
    subs = await listSubmissions();
  } catch (e) {
    loadErr = e instanceof Error ? e.message : "Could not load submissions.";
  }
  const links = await listLinks().catch(() => [] as BookingLink[]);
  // Newest link per request.
  const linkFor = (id: string) => links.filter((l) => l.qid === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const waitlist = subs.filter((s) => s.kind === "waitlist");
  const warn = (
    <>
      {!storageConfigured && (
        <p className="warn">
          No database connected, so submissions and board moves are only kept until the server restarts. Add REDIS_URL in Vercel (Settings, Environment Variables) and redeploy.
        </p>
      )}
      {loadErr && <p className="warn">{loadErr}</p>}
    </>
  );

  if (sp.show === "waitlist") {
    return (
      <AdminShell tab="subs">
        <main className="adm">
          <div className="top">
            <h1>Waitlist</h1>
            <Link href="/admin/submissions" className="ghostpill">
              Back to the board
            </Link>
          </div>
          {warn}
          <p style={{ color: "#5B6474", marginTop: 0 }}>People outside the service area who asked to hear when you get there.</p>
          {waitlist.length === 0 ? <p className="empty">No waitlist signups yet.</p> : waitlist.map((s) => <Card key={s.id} s={s} />)}
        </main>
      </AdminShell>
    );
  }

  let pipe: Awaited<ReturnType<typeof loadPipeline>> = {};
  let stages: StageDef[] = DEFAULT_STAGES;
  let pipeErr = "";
  try {
    [pipe, stages] = await Promise.all([loadPipeline(), loadStages()]);
  } catch (e) {
    console.error("[pipeline] load failed", e);
    pipeErr = "Couldn't load board stages, so every request shows as New for now.";
  }
  const leads = subs.filter((s) => s.kind === "quote").map((s) => toLead(stages, s, linkFor(s.id), pipe[s.id]));

  return (
    <AdminShell tab="subs">
      <SubmissionsBoard stages={stages} leads={leads} openId={sp.open} now={Date.now()} waitlistCount={waitlist.length} notice={[loadErr, pipeErr, storageConfigured ? "" : "No database connected, so submissions and board moves are only kept until the server restarts. Add REDIS_URL in Vercel and redeploy."].filter(Boolean)} />
    </AdminShell>
  );
}
