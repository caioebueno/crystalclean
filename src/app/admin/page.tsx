import type { Metadata } from "next";
import Link from "next/link";
import { adminConfigured, isAdmin } from "@/lib/adminAuth";
import { listSubmissions, storageConfigured, type Submission } from "@/lib/submissions";
import { login, logout } from "./actions";
import "./admin.css";

export const metadata: Metadata = { title: "Submissions", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  type: "Type",
  zip: "ZIP",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
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

function Card({ s }: { s: Submission }) {
  const d = s.data;
  const phone = val(d.phone);
  const isQuote = s.kind === "quote";
  const title = isQuote ? val(d.name) || "Quote request" : "Waitlist signup";
  const tag = isQuote ? (val(d.type) === "rental" ? "Rental quote" : "Home quote") : "Waitlist";
  return (
    <article className="sub">
      <header>
        <div>
          <span className={`tag tag-${isQuote ? (val(d.type) === "rental" ? "rental" : "home") : "wait"}`}>{tag}</span>
          <h2>{title}</h2>
        </div>
        <time dateTime={s.receivedAt}>{fmtDate(s.receivedAt)}</time>
      </header>
      {phone && (
        <div className="contact">
          <span className="phone">{fmtPhone(phone)}</span>
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
    </article>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; show?: string }> }) {
  const sp = await searchParams;

  if (!adminConfigured) {
    return (
      <main className="adm adm-narrow">
        <h1>Submissions</h1>
        <p>
          Set an <code>ADMIN_PASSWORD</code> environment variable in Vercel (Project → Settings → Environment Variables), then redeploy.
        </p>
      </main>
    );
  }

  if (!(await isAdmin())) {
    return (
      <main className="adm adm-narrow">
        <h1>Submissions</h1>
        <form action={login} className="login">
          <label>
            Password
            <input type="password" name="password" autoComplete="current-password" required autoFocus />
          </label>
          {sp.error && <p className="err">Wrong password.</p>}
          <button type="submit">Sign in</button>
        </form>
      </main>
    );
  }

  const show = sp.show === "quote" || sp.show === "waitlist" ? sp.show : "all";
  let subs: Submission[] = [];
  let loadErr = "";
  try {
    subs = await listSubmissions();
  } catch (e) {
    loadErr = e instanceof Error ? e.message : "Could not load submissions.";
  }
  const counts = { all: subs.length, quote: subs.filter((s) => s.kind === "quote").length, waitlist: subs.filter((s) => s.kind === "waitlist").length };
  const shown = show === "all" ? subs : subs.filter((s) => s.kind === show);

  return (
    <main className="adm">
      <div className="top">
        <h1>Submissions</h1>
        <form action={logout}>
          <button type="submit" className="ghost">
            Sign out
          </button>
        </form>
      </div>
      {!storageConfigured && (
        <p className="warn">
          No database connected, so submissions are only kept until the server restarts. Add the Upstash for Redis integration in Vercel (Storage tab) and
          redeploy.
        </p>
      )}
      {loadErr && <p className="warn">{loadErr}</p>}
      <nav className="tabs">
        {(["all", "quote", "waitlist"] as const).map((k) => (
          <Link key={k} href={k === "all" ? "/admin" : `/admin?show=${k}`} className={show === k ? "on" : ""}>
            {k === "all" ? "All" : k === "quote" ? "Quotes" : "Waitlist"} ({counts[k]})
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? <p className="empty">No submissions yet.</p> : shown.map((s) => <Card key={s.id} s={s} />)}
    </main>
  );
}
