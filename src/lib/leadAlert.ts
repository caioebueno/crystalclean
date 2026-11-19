/**
 * Instant email to the owner when a new lead is saved (quote request or waitlist signup).
 *
 * Sent through Resend (https://resend.com) with a plain fetch, no extra package.
 * Set in Vercel (Settings → Environment Variables), then redeploy:
 *  - RESEND_API_KEY: the API key from Resend.
 *  - LEAD_ALERT_EMAIL: where the alerts go. Several addresses can be separated by commas.
 *  - LEAD_ALERT_FROM (optional): the sender. Defaults to Resend's test sender, which only
 *    delivers to the email you signed up to Resend with. Verify a domain in Resend to use your own.
 *
 * Without RESEND_API_KEY or LEAD_ALERT_EMAIL nothing is sent. A failed email never blocks the lead:
 * the lead is already saved, and the error is printed to the Vercel logs.
 */

import { site } from "@/config/site";
import type { Submission } from "@/lib/submissions";

const apiKey = process.env.RESEND_API_KEY ?? "";
const to = (process.env.LEAD_ALERT_EMAIL ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const from = process.env.LEAD_ALERT_FROM || "Crystal Clean Leads <onboarding@resend.dev>";
export const leadAlertConfigured = Boolean(apiKey && to.length);

const val = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(", ") : v ?? "");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const digits = (p: string) => p.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
const fmtPhone = (p: string) => {
  const d = digits(p);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
};
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });

/** Link to the request card in the admin Requests tab. */
export const requestUrl = (s: Submission) => `${site.url}/admin/submissions?show=${s.kind}#r-${s.id}`;

/** The email's subject, rows and links. Exported so it can be checked without sending. */
export function buildLeadEmail(s: Submission) {
  const d = s.data;
  const isQuote = s.kind === "quote";
  const kindLabel = isQuote ? (val(d.type) === "rental" ? "Vacation rental quote" : "Home quote") : "Waitlist signup";
  const name = val(d.name);
  const phone = val(d.phone);
  const tel = digits(phone).length === 10 ? `+1${digits(phone)}` : phone;

  const rows: [string, string][] = (
    [
      ["Type", kindLabel],
      ["Name", name],
      ["Phone", phone ? fmtPhone(phone) : ""],
      ["ZIP", val(d.zip)],
      ["Bedrooms", val(d.bedrooms)],
      ["Bathrooms", val(d.bathrooms)],
      ["Plan", val(d.plan)],
      ["Price shown", val(d.priceShown)],
      ["Page", val(d.offer)],
      ["Ad", val(d.source) || (isQuote ? "None (direct or organic)" : "")],
      ["Received", fmtDate(s.receivedAt)],
    ] as [string, string][]
  ).filter(([, v]) => v !== "");

  const subject = isQuote
    ? `New lead: ${name || "Quote request"}${val(d.zip) ? ` · ${val(d.zip)}` : ""}${val(d.priceShown) ? ` · ${val(d.priceShown)}` : ""}`
    : `New waitlist signup${val(d.zip) ? ` · ${val(d.zip)}` : ""}`;
  const link = requestUrl(s);

  const text = [
    isQuote ? "New quote request on the website." : "New waitlist signup (outside the service area).",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Open the request: ${link}`,
    phone ? `Call or text: ${tel}` : "",
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  const btn = (href: string, label: string, primary = false) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:999px;font-weight:600;text-decoration:none;${
      primary ? "background:#0E1F3D;color:#fff" : "background:#EEF1F6;color:#0E1F3D"
    }">${esc(label)}</a>`;

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#F5F3EE;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0E1F3D">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
<p style="margin:0 0 4px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#5B6474">${esc(kindLabel)}</p>
<h1 style="margin:0 0 16px;font-size:22px">${esc(isQuote ? name || "New quote request" : "New waitlist signup")}</h1>
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#5B6474;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join("")}</table>
<div style="margin-top:20px">${btn(link, "Open request", true)}${phone ? btn(`tel:${tel}`, "Call") + btn(`sms:${tel}`, "Text") : ""}</div>
</div></body></html>`;

  return { subject, text, html };
}

/** Sends the alert. Never throws. */
export async function sendLeadAlert(s: Submission): Promise<void> {
  if (!leadAlertConfigured) {
    if (process.env.NODE_ENV === "production") console.warn("[lead alert] RESEND_API_KEY or LEAD_ALERT_EMAIL not set: no email sent.");
    return;
  }
  const { subject, text, html } = buildLeadEmail(s);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `lead-${s.id}` },
      body: JSON.stringify({ from, to, subject, text, html }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[lead alert] Resend refused the email", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[lead alert] could not send", e);
  }
}
