/**
 * Customers, plans and visits storage. Same Redis as the booking links (see bookingStore.ts):
 * one hash `cc:customers` keyed by customer id, each value the customer with their plan and visits.
 * Without Redis, kept in memory.
 *
 * Booking links feed it automatically:
 *  - a booked link becomes a customer (or joins the customer with the same phone), with the
 *    option they picked as the plan and every visit placed (importBookedLink);
 *  - a sent or viewed link shows as a "Pending pick" customer with a tentative visit (withPending).
 */
import { redis, storageConfigured, listSubmissions } from "@/lib/submissions";
import { getLink, listLinks, putLink } from "@/lib/bookingStore";
import { digits, shownStatus, type BookingLink } from "@/lib/booking";
import {
  FREQ_CHOICES,
  TERM_CHOICES,
  fullName,
  genVisits,
  isoOf,
  newId,
  oAdd,
  oCount,
  oMD,
  oStep,
  planName,
  splitName,
  todayIso,
  byDate,
  type HistItem,
  type OFreq,
  type OpsCustomer,
  type OWin,
  type Paid,
  type Pending,
  type Plan,
  type Visit,
  type VisitStatus,
} from "@/lib/ops";

const KEY = "cc:customers";
const IMPORTS = "cc:linkimports";
const g = globalThis as unknown as { __ccCust?: Map<string, string>; __ccImports?: Set<string> };
const memory = (g.__ccCust ??= new Map());
const memImports = (g.__ccImports ??= new Set());

const parse = (raw: unknown): OpsCustomer | undefined => {
  try {
    return typeof raw === "string" ? (JSON.parse(raw) as OpsCustomer) : undefined;
  } catch {
    return undefined;
  }
};

const validId = (id: string) => /^[a-z0-9-]{3,60}$/.test(id);

export async function getCustomer(id: string): Promise<OpsCustomer | undefined> {
  if (!validId(id)) return undefined;
  return parse(storageConfigured ? await redis<string | null>(["HGET", KEY, id]) : memory.get(id));
}

export async function listCustomers(): Promise<OpsCustomer[]> {
  let values: unknown[];
  if (storageConfigured) {
    const r = await redis<unknown>(["HGETALL", KEY]);
    values = Array.isArray(r) ? r.filter((_, i) => i % 2 === 1) : r && typeof r === "object" ? Object.values(r) : [];
  } else values = [...memory.values()];
  return values.map(parse).filter((c): c is OpsCustomer => !!c);
}

async function putCustomer(c: OpsCustomer) {
  const clean: OpsCustomer = { ...c, pending: undefined, virtual: undefined };
  const raw = JSON.stringify(clean);
  if (storageConfigured) await redis(["HSET", KEY, c.id, raw]);
  else memory.set(c.id, raw);
  console.log("[customer]", raw); // backup copy in the Vercel logs
  return clean;
}

/* ---------- Validation of what the admin page sends ---------- */

const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const raw = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);
const pick = <T extends string>(v: unknown, allowed: readonly T[], dflt: T): T => (allowed.includes(v as T) ? (v as T) : dflt);
const isoDate = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : "");
const hhmm = (v: unknown) => (/^\d{2}:\d{2}$/.test(String(v)) ? String(v) : "13:00");
const price = (v: unknown) => String(Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0);
const WINS: OWin[] = ["morning", "midday", "afternoon", "custom"];
const FREQS: OFreq[] = [...FREQ_CHOICES, "fourweek"];
const TERMS = TERM_CHOICES.map((t) => t[0]);
const STATUSES: VisitStatus[] = ["scheduled", "done", "skipped", "rescheduled", "cancelled", "paused"];
const PAID: Paid[] = ["", "Cash", "Zelle", "Card", "Not yet"];

function cleanPlan(v: unknown): Plan | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  return {
    type: p.type === "once" ? "once" : "plan",
    freq: pick(p.freq, FREQS, "biweekly"),
    term: pick(p.term, TERMS, "3"),
    price: price(p.price),
    win: pick(p.win, WINS, "afternoon"),
    t: hhmm(p.t),
    start: isoDate(p.start),
  };
}

function cleanVisit(v: unknown): Visit | null {
  const x = (v ?? {}) as Record<string, unknown>;
  const date = isoDate(x.date);
  if (!date || !/^[a-z0-9]{2,30}$/i.test(String(x.id))) return null;
  return {
    id: String(x.id),
    date,
    win: pick(x.win, WINS, "afternoon"),
    t: hhmm(x.t),
    status: pick(x.status, STATUSES, "scheduled"),
    price: price(x.price),
    paid: pick(x.paid, PAID, ""),
    note: str(x.note, 300),
    priv: raw(x.priv, 1000),
    ...(x.oneOff ? { oneOff: true } : {}),
  };
}

export function cleanCustomer(body: unknown): OpsCustomer | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const id = String(b.id ?? "");
  if (!validId(id)) return "That customer id isn't valid.";
  const first = str(b.first, 60);
  if (!first) return "Add a name to save.";
  const visits = (Array.isArray(b.visits) ? b.visits.slice(0, 400) : []).map(cleanVisit).filter((v): v is Visit => !!v);
  const history: HistItem[] = (Array.isArray(b.history) ? b.history.slice(-200) : []).map((h) => {
    const x = (h ?? {}) as Record<string, unknown>;
    return { d: isoDate(x.d) || todayIso(), t: str(x.t, 200) };
  });
  return {
    id,
    rev: Math.max(0, Math.floor(Number(b.rev) || 0)),
    first,
    lastName: str(b.lastName, 80),
    phone: str(b.phone, 40),
    email: str(b.email, 120),
    addr: str(b.addr, 200),
    addrNotes: str(b.addrNotes, 200),
    type: b.type === "rental" ? "rental" : "home",
    beds: Math.max(0, Math.min(8, Math.round(Number(b.beds) || 0))),
    baths: Math.max(0, Math.min(8, Math.round((Number(b.baths) || 0) * 2) / 2)),
    size: str(b.size, 60),
    lastClean: str(b.lastClean, 60),
    extras: Array.isArray(b.extras) ? b.extras.slice(0, 20).map((x) => str(x, 40)).filter(Boolean) : [],
    pets: str(b.pets, 120),
    quoteNotes: str(b.quoteNotes, 2000),
    important: str(b.important, 120),
    plan: cleanPlan(b.plan),
    ...(b.paused ? { paused: true } : {}),
    ...(b.cancelled ? { cancelled: true } : {}),
    history,
    visits,
    linkIds: Array.isArray(b.linkIds) ? b.linkIds.slice(0, 50).map((x) => str(x, 60)).filter(validId) : [],
    ...(b.qid ? { qid: str(b.qid, 60) } : {}),
    createdAt: str(b.createdAt, 40) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Save from the admin page. Refuses if someone (or a booking) changed the customer since the page loaded it. */
export async function saveCustomer(c: OpsCustomer): Promise<{ ok: true; customer: OpsCustomer } | { ok: false; conflict: true; customer: OpsCustomer }> {
  const prev = await getCustomer(c.id);
  if (prev && prev.rev !== c.rev) return { ok: false, conflict: true, customer: prev };
  const saved = await putCustomer({ ...c, rev: (prev?.rev ?? 0) + 1, createdAt: prev?.createdAt ?? c.createdAt });
  return { ok: true, customer: saved };
}

/* ---------- Booking links → customers ---------- */

const samePhone = (a: string, b: string) => {
  const x = digits(a).replace(/^1(?=\d{10}$)/, "");
  const y = digits(b).replace(/^1(?=\d{10}$)/, "");
  return x.length >= 10 && x === y;
};

const linkWin = (l: BookingLink): { win: OWin; t: string } => ({ win: l.win, t: l.cStart || "13:00" });

const fullAddr = (l: BookingLink) => {
  const a = (l.cust.addr || "").trim();
  return l.cust.zip && !a.includes(l.cust.zip) ? `${a}${a ? ", FL " : ""}${l.cust.zip}` : a;
};

/** Claim a link for import, so two requests never create the customer twice. */
async function claim(linkId: string) {
  if (storageConfigured) return Number(await redis<number>(["HSETNX", IMPORTS, linkId, new Date().toISOString()])) === 1;
  if (memImports.has(linkId)) return false;
  memImports.add(linkId);
  return true;
}
async function unclaim(linkId: string) {
  if (storageConfigured) await redis(["HDEL", IMPORTS, linkId]);
  else memImports.delete(linkId);
}

async function quoteReceived(qid: string) {
  if (!qid) return "";
  const s = (await listSubmissions().catch(() => [])).find((x) => x.id === qid);
  return s ? isoOf(s.receivedAt) : "";
}

const linkHistory = (l: BookingLink, quoteDay: string): HistItem[] =>
  [
    quoteDay ? { d: quoteDay, t: "Quote received" } : null,
    { d: isoOf(l.createdAt), t: "Booking link sent" },
    l.viewedAt ? { d: isoOf(l.viewedAt), t: "Link viewed" } : null,
  ].filter((h): h is HistItem => !!h);

/**
 * Turn a booked link into a customer with a plan and all their visits.
 * Joins an existing customer with the same phone (or one that already owns the link).
 * Safe to call more than once: only the first call for a link does anything.
 */
export async function importBookedLink(l: BookingLink, customers?: OpsCustomer[]): Promise<OpsCustomer | undefined> {
  if (l.status !== "booked" || l.customerId) return undefined;
  const o = l.options.find((x) => x.id === l.picked);
  if (!o) return undefined;
  if (!(await claim(l.id))) return undefined;
  try {
    const all = customers ?? (await listCustomers());
    const phone = l.bookedPhone || l.cust.phone;
    const existing = all.find((c) => c.linkIds.includes(l.id)) ?? all.find((c) => samePhone(c.phone, phone));
    const { win, t } = linkWin(l);
    const plan: Plan = { type: o.type, freq: o.freq, term: o.type === "once" ? "1" : o.term, price: o.price, win, t, start: l.date };
    const visits = genVisits(plan, plan.start, oCount(plan.type, plan.freq, plan.term));
    const booked: HistItem = { d: l.bookedAt ? isoOf(l.bookedAt) : todayIso(), t: `Booked: ${o.name} · $${o.price}${o.type === "plan" ? " per clean" : ""}` };
    const now = new Date().toISOString();
    let c: OpsCustomer;
    if (existing) {
      const fresh = (await getCustomer(existing.id)) ?? existing;
      c = {
        ...fresh,
        plan,
        paused: undefined,
        cancelled: undefined,
        visits: fresh.visits.concat(visits),
        linkIds: [...new Set([...fresh.linkIds, l.id])],
        history: fresh.history.concat([...linkHistory(l, ""), booked]),
        rev: fresh.rev + 1,
        updatedAt: now,
      };
    } else {
      const { first, lastName } = splitName(l.cust.name);
      c = {
        id: newId("c").toLowerCase(),
        rev: 1,
        first: first || "Customer",
        lastName,
        phone,
        email: l.cust.email || "",
        addr: fullAddr(l),
        addrNotes: l.cust.addrNotes || "",
        type: l.cust.type,
        beds: l.cust.beds,
        baths: l.cust.baths,
        size: l.cust.size,
        lastClean: l.cust.last,
        extras: l.cust.extras || [],
        pets: "",
        quoteNotes: l.cust.notes || "",
        important: "",
        plan,
        history: [...linkHistory(l, await quoteReceived(l.qid)), booked],
        visits,
        linkIds: [l.id],
        ...(l.qid ? { qid: l.qid } : {}),
        createdAt: now,
        updatedAt: now,
      };
    }
    await putCustomer(c);
    await putLink({ ...l, customerId: c.id });
    console.log(`[customer] ${fullName(c)}: ${planName(plan)}, ${visits.length} visits from link ${l.id}`);
    return c;
  } catch (e) {
    await unclaim(l.id).catch(() => {});
    throw e;
  }
}

/** Plans with no end date get visits a year ahead; keep at least six months placed as time goes on. */
function topUp(c: OpsCustomer, today: string): OpsCustomer | null {
  const p = c.plan;
  if (!p || p.type === "once" || p.term !== "none" || c.paused || c.cancelled) return null;
  const planned = c.visits.filter((v) => !v.oneOff).sort(byDate);
  const last = planned[planned.length - 1];
  if (!last || last.date > oAdd(today, 182)) return null;
  const more = genVisits(p, oStep(p.freq, last.date, 1), oCount("plan", p.freq, "6"));
  return { ...c, visits: c.visits.concat(more), rev: c.rev + 1, updatedAt: new Date().toISOString() };
}

const sentLine = (l: BookingLink) =>
  `Link sent ${oMD(isoOf(l.createdAt))} · ${l.viewedAt ? "viewed " + oMD(isoOf(l.viewedAt)) : "not viewed yet"}`;

const toPending = (l: BookingLink): Pending => {
  const { win, t } = linkWin(l);
  return {
    link: l.id,
    date: l.date,
    win,
    t,
    sent: sentLine(l),
    options: l.options.map((o) => ({ id: o.id, type: o.type, freq: o.freq, term: o.term, price: o.price, name: o.name })),
  };
};

/** A customer record for a link that isn't booked yet and has no customer. Shown, not saved. */
function virtualFromLink(l: BookingLink): OpsCustomer {
  const { first, lastName } = splitName(l.cust.name);
  return {
    id: `link-${l.id}`.slice(0, 60),
    rev: 0,
    virtual: true,
    first: first || "Customer",
    lastName,
    phone: l.cust.phone,
    email: l.cust.email || "",
    addr: fullAddr(l),
    addrNotes: l.cust.addrNotes || "",
    type: l.cust.type,
    beds: l.cust.beds,
    baths: l.cust.baths,
    size: l.cust.size,
    lastClean: l.cust.last,
    extras: l.cust.extras || [],
    pets: "",
    quoteNotes: l.cust.notes || "",
    important: "",
    plan: null,
    history: linkHistory(l, ""),
    visits: [],
    linkIds: [l.id],
    ...(l.qid ? { qid: l.qid } : {}),
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    pending: toPending(l),
  };
}

/** Attach every open (sent or viewed) link to its customer, or show it as a new pending customer. */
function withPending(customers: OpsCustomer[], links: BookingLink[]): OpsCustomer[] {
  const out: OpsCustomer[] = customers.map((c) => ({ ...c, pending: null }));
  const open = links
    .filter((l) => {
      const st = shownStatus(l);
      return (st === "sent" || st === "viewed") && !!l.date;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)); // newest wins when a customer has two
  for (const l of open) {
    const i = out.findIndex((c) => c.linkIds.includes(l.id) || samePhone(c.phone, l.cust.phone));
    if (i >= 0) out[i] = { ...out[i], pending: toPending(l) };
    else out.push(virtualFromLink(l));
  }
  return out;
}

/** Everything the Calendar and Customers tabs need. Imports newly booked links first. */
export async function loadOps() {
  const today = todayIso();
  const links = await listLinks();
  let customers = await listCustomers();
  for (const l of links.filter((x) => x.status === "booked" && !x.customerId)) {
    try {
      const c = await importBookedLink(l, customers);
      if (c) customers = customers.filter((x) => x.id !== c.id).concat([c]);
    } catch (e) {
      console.error("[customer] import failed for link", l.id, e);
    }
  }
  for (const c of customers) {
    const t = topUp(c, today);
    if (t) {
      await putCustomer(t);
      customers = customers.map((x) => (x.id === t.id ? t : x));
    }
  }
  return { today, customers: withPending(customers, links) };
}

/** "Mark as booked" for a customer who answered by text instead of tapping the link. */
export async function bookFromAdmin(linkId: string, optionId: string) {
  const l = await getLink(linkId);
  if (!l) return "That booking link no longer exists.";
  const st = shownStatus(l);
  if (st !== "booked") {
    if (st === "cancelled") return "That booking link was cancelled.";
    if (!l.options.some((o) => o.id === optionId)) return "Choose one of the options.";
    const now = new Date().toISOString();
    await putLink({ ...l, status: "booked", picked: optionId, bookedAt: now, bookedPhone: l.cust.phone, textMe: false, viewedAt: l.viewedAt });
  }
  const fresh = await getLink(linkId);
  if (fresh) await importBookedLink(fresh);
  return "";
}
