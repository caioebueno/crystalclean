/**
 * Booking links storage. Same Redis as the form submissions (see submissions.ts),
 * one hash `cc:links` keyed by link code. Without Redis, kept in memory.
 */
import { randomBytes } from "node:crypto";
import { redis, storageConfigured, type Submission } from "@/lib/submissions";
import {
  blankCustomer,
  EXPIRES,
  extraKey,
  FREQ,
  num,
  PLANS,
  SIZES,
  LASTS,
  TERMS,
  WINS,
  type BookingLink,
  type Customer,
  type LinkInput,
  type PriceOption,
  type QuotePick,
} from "@/lib/booking";

const KEY = "cc:links";
const g = globalThis as unknown as { __ccLinks?: Map<string, string> };
const memory = (g.__ccLinks ??= new Map());

const parse = (raw: unknown): BookingLink | undefined => {
  try {
    return typeof raw === "string" ? (JSON.parse(raw) as BookingLink) : undefined;
  } catch {
    return undefined;
  }
};

export async function getLink(id: string): Promise<BookingLink | undefined> {
  if (!/^[a-z0-9-]{3,60}$/.test(id)) return undefined;
  const raw = storageConfigured ? await redis<string | null>(["HGET", KEY, id]) : memory.get(id);
  return parse(raw);
}

/** Newest first. */
export async function listLinks(): Promise<BookingLink[]> {
  let values: unknown[];
  if (storageConfigured) {
    const r = await redis<unknown>(["HGETALL", KEY]);
    values = Array.isArray(r) ? r.filter((_, i) => i % 2 === 1) : r && typeof r === "object" ? Object.values(r) : [];
  } else values = [...memory.values()];
  return values
    .map(parse)
    .filter((l): l is BookingLink => !!l)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function putLink(l: BookingLink) {
  const raw = JSON.stringify(l);
  if (storageConfigured) await redis(["HSET", KEY, l.id, raw]);
  else memory.set(l.id, raw);
  console.log("[booking-link]", raw); // backup copy in the Vercel logs
}

async function newId(name: string) {
  const base = (name.trim().split(/\s+/)[0] || "customer").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 20) || "customer";
  for (let i = 0; i < 8; i++) {
    const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
    const code = [...randomBytes(4)].map((b) => alphabet[b % alphabet.length]).join("");
    const id = `${base}-${code}`;
    if (!(await getLink(id))) return id;
  }
  throw new Error("Could not make a link code");
}

const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const pick = <T extends string>(v: unknown, allowed: readonly T[], dflt: T): T => (allowed.includes(v as T) ? (v as T) : dflt);

/** Validate whatever the admin form sent. Returns an error message or the clean input. */
export function cleanInput(body: unknown): LinkInput | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const c = (b.cust ?? {}) as Record<string, unknown>;
  const cust: Customer = {
    ...blankCustomer(),
    name: str(c.name, 120),
    phone: str(c.phone, 40),
    email: str(c.email, 120),
    addr: str(c.addr, 200),
    zip: str(c.zip, 10),
    addrNotes: str(c.addrNotes, 200),
    type: c.type === "rental" ? "rental" : "home",
    beds: Math.max(0, Math.min(8, Math.round(Number(c.beds) || 0))),
    baths: Math.max(1, Math.min(8, Math.round((Number(c.baths) || 1) * 2) / 2)),
    size: str(c.size, 60),
    last: str(c.last, 60),
    plan: str(c.plan, 60),
    extras: Array.isArray(c.extras) ? c.extras.slice(0, 20).map((x) => str(x, 80)).filter(Boolean) : [],
    notes: str(c.notes, 2000),
  };
  const opts = Array.isArray(b.options) ? b.options.slice(0, 3) : [];
  const options: PriceOption[] = opts.map((raw, i) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const type = o.type === "plan" ? "plan" : "once";
    const first = num(String(o.first ?? ""));
    return {
      id: /^[a-z0-9]{1,12}$/.test(String(o.id)) ? String(o.id) : `o${i + 1}`,
      type,
      freq: pick(o.freq, FREQ.map((f) => f[0]), "biweekly"),
      term: pick(o.term, TERMS.map((t) => t[0]), "3"),
      price: String(num(String(o.price ?? ""))),
      // Only plans have a separate first-visit price; blank means the same as every visit.
      first: type === "plan" && first ? String(first) : "",
      name: str(o.name, 80),
      note: str(o.note, 120),
      badge: pick(o.badge, ["", "Most popular", "Best value"] as const, ""),
    };
  });
  const input: LinkInput = {
    qid: str(b.qid, 60),
    cust,
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : "",
    win: pick(b.win, WINS.map((w) => w[0]), "afternoon"),
    cStart: /^\d{2}:\d{2}$/.test(String(b.cStart)) ? String(b.cStart) : "14:00",
    cEnd: /^\d{2}:\d{2}$/.test(String(b.cEnd)) ? String(b.cEnd) : "17:00",
    options,
    sentBy: str(b.sentBy, 60),
    msg: str(b.msg, 600),
    expires: pick(b.expires, EXPIRES.map((e) => e[0]), "3"),
  };
  const errs: string[] = [];
  if (!cust.name) errs.push("a customer name");
  if (!input.date) errs.push("a date");
  if (!options.length || options.some((o) => !num(o.price))) errs.push("a price for every option");
  if (errs.length) return `Add ${errs.join(", ")} to create the link.`;
  if (input.win === "custom" && input.cEnd <= input.cStart) return "The arrival window has to end after it starts.";
  return input;
}

const expiryFrom = (expires: LinkInput["expires"], from: number) => (expires === "never" ? null : new Date(from + Number(expires) * 86400000).toISOString());

export async function saveLink(input: LinkInput, editingId?: string): Promise<BookingLink> {
  const now = Date.now();
  const prev = editingId ? await getLink(editingId) : undefined;
  if (editingId && !prev) throw new Error("That link no longer exists.");
  const iso = new Date(now).toISOString();
  const link: BookingLink = prev
    ? {
        ...prev,
        ...input,
        // Saving a cancelled link brings it back; an expired one gets a fresh expiry.
        status: prev.status === "cancelled" ? prev.prevStatus ?? "sent" : prev.status,
        updatedAt: iso,
        expiresAt: prev.status === "booked" ? prev.expiresAt : expiryFrom(input.expires, now),
        picked: prev.picked && input.options.some((o) => o.id === prev.picked) ? prev.picked : prev.status === "booked" ? prev.picked : undefined,
      }
    : { ...input, id: await newId(input.cust.name), status: "sent", createdAt: iso, updatedAt: iso, expiresAt: expiryFrom(input.expires, now) };
  await putLink(link);
  return link;
}

/** Turn a saved quote request into a customer for the form. */
export function quoteToPick(s: Submission): QuotePick {
  const d = s.data;
  const one = (k: string) => (Array.isArray(d[k]) ? (d[k] as string[]).join(", ") : ((d[k] as string) ?? ""));
  const list = (k: string) => (Array.isArray(d[k]) ? (d[k] as string[]) : d[k] ? [String(d[k])] : []);
  const beds = one("bedrooms");
  const baths = one("bathrooms");
  const dayKeys: Record<string, string> = { Monday: "mon", Tuesday: "tue", Wednesday: "wed", Thursday: "thu", Friday: "fri", Saturday: "sat", "Any day works": "any" };
  const winKeys: Record<string, string> = { "Morning · 8–11 am": "morning", "Midday · 11 am–2 pm": "midday", "Afternoon · 2–5 pm": "afternoon", "Any time": "any" };
  const size = one("size");
  const last = one("lastClean");
  const plan = one("plan");
  return {
    qid: s.id,
    received: new Date(s.receivedAt).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }),
    zip: one("zip"),
    days: list("days").map((x) => dayKeys[x] ?? x),
    wins: list("timeOfDay").map((x) => winKeys[x] ?? x),
    cust: {
      ...blankCustomer(),
      name: one("name"),
      phone: one("phone"),
      addr: one("address"),
      zip: one("zip"),
      type: one("type") === "rental" ? "rental" : "home",
      beds: beds === "Studio" ? 0 : parseInt(beds, 10) || 0,
      baths: (parseInt(baths, 10) || 1) + (baths.includes("½") ? 0.5 : 0),
      size: SIZES.includes(size) ? size : size || blankCustomer().size,
      last: LASTS.includes(last) ? last : last || blankCustomer().last,
      plan: PLANS.includes(plan) ? plan : plan || blankCustomer().plan,
      extras: list("extras").map(extraKey),
      notes: one("notes"),
    },
  };
}
