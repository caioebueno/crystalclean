/**
 * Calendar and customers: shared types and plan/date logic.
 * Ported from the Claude Design export (website-design/calendar.html).
 * Safe to import from client and server code (no storage here, see opsStore.ts).
 *
 * Dates are plain "YYYY-MM-DD" strings in Orlando time; all math is done in UTC so
 * daylight saving never shifts a day.
 */
import type { Term } from "@/lib/booking";

export type OWin = "morning" | "midday" | "afternoon" | "custom";
/**
 * weekly / biweekly / fourweek (every 28 days, what booking links offer) /
 * monthly (same week and weekday each month, e.g. "3rd Thursday", as in the calendar design).
 */
export type OFreq = "weekly" | "biweekly" | "fourweek" | "monthly";
export type VisitStatus = "scheduled" | "done" | "skipped" | "rescheduled" | "cancelled" | "pending" | "paused";
export type Paid = "" | "Cash" | "Zelle" | "Card" | "Not yet";

export type Plan = {
  type: "once" | "plan";
  freq: OFreq;
  term: Term;
  price: string;
  win: OWin;
  /** HH:MM, used when win is "custom". */
  t: string;
  start: string;
};

export type Visit = {
  id: string;
  date: string;
  win: OWin;
  t: string;
  status: VisitStatus;
  price: string;
  paid: Paid;
  note: string;
  /** Private notes for this visit (gate code, dog in backyard). */
  priv: string;
  oneOff?: boolean;
};

export type HistItem = { d: string; t: string };

export type PendingOption = { id: string; type: "once" | "plan"; freq: OFreq; term: Term; price: string; name: string };
/** A booking link that's sent but not booked yet. Built from the link on every load, never stored. */
export type Pending = { link: string; date: string; win: OWin; t: string; sent: string; options: PendingOption[] };

export type OpsCustomer = {
  id: string;
  /** Bumped on every save, so a stale tab can't overwrite newer changes. */
  rev: number;
  first: string;
  lastName: string;
  phone: string;
  email: string;
  addr: string;
  addrNotes: string;
  type: "home" | "rental";
  beds: number;
  baths: number;
  size: string;
  lastClean: string;
  extras: string[];
  pets: string;
  quoteNotes: string;
  important: string;
  plan: Plan | null;
  paused?: boolean;
  cancelled?: boolean;
  history: HistItem[];
  visits: Visit[];
  /** Booking links that belong to this customer. */
  linkIds: string[];
  qid?: string;
  createdAt: string;
  updatedAt: string;
  /** Only on the client: an open booking link for this customer. */
  pending?: Pending | null;
  /** Only on the client: not saved yet (a pending link with no customer record). */
  virtual?: boolean;
};

export const HOME_TZ = "America/New_York";
/** Today in Orlando as YYYY-MM-DD. */
export const todayIso = (now = new Date()) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: HOME_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const g = (k: string) => p.find((x) => x.type === k)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
};
export const isoOf = (instant: string) => todayIso(new Date(instant));

export const O_WIN: Record<Exclude<OWin, "custom">, [string, string, number, number]> = {
  morning: ["Morning", "8–11 am", 8, 11],
  midday: ["Midday", "11 am–2 pm", 11, 14],
  afternoon: ["Afternoon", "2–5 pm", 14, 17],
};
export const O_FREQ: Record<OFreq, string> = { weekly: "Every week", biweekly: "Every 2 weeks", fourweek: "Every 4 weeks", monthly: "Monthly" };
export const O_FSHORT: Record<OFreq, string> = { weekly: "wk", biweekly: "2 wks", fourweek: "4 wks", monthly: "mo" };
/** Frequencies offered when adding or changing a plan here (the design's three). A plan from a link can also be every 4 weeks. */
export const FREQ_CHOICES: OFreq[] = ["weekly", "biweekly", "monthly"];
export const TERM_CHOICES: [Term, string][] = [
  ["1", "1 month"],
  ["3", "3 months"],
  ["6", "6 months"],
  ["12", "12 months"],
  ["none", "No end date"],
];
export const O_EXTRAS: [string, string][] = [
  ["sheets", "Bed sheet change"],
  ["fridge", "Inside the fridge"],
  ["oven", "Inside the oven"],
  ["windows", "Interior windows"],
  ["exterior", "Exterior cleaning"],
  ["laundry", "Laundry"],
  ["cabinets", "Inside cabinets"],
  ["baseboards", "Baseboards and blinds"],
  ["garage", "Garage sweep"],
  ["pet", "Pet hair treatment"],
];

export const oP = (s: string) => {
  const a = s.split("-").map(Number);
  return new Date(Date.UTC(a[0], a[1] - 1, a[2] || 1));
};
export const oS = (d: Date) => d.toISOString().slice(0, 10);
export const oAdd = (s: string, n: number) => {
  const d = oP(s);
  d.setUTCDate(d.getUTCDate() + n);
  return oS(d);
};
export const oF = (s: string, o: Intl.DateTimeFormatOptions) => oP(s).toLocaleDateString("en-US", { timeZone: "UTC", ...o });
export const oShort = (s: string) => oF(s, { weekday: "short", month: "short", day: "numeric" });
export const oMD = (s: string) => oF(s, { month: "short", day: "numeric" });
export const oDiff = (a: string, b: string) => Math.round((oP(b).getTime() - oP(a).getTime()) / 86400000);

/** Date of the k-th visit of a plan that starts on `start`. */
export const oStep = (freq: OFreq, start: string, k: number) => {
  if (freq === "weekly") return oAdd(start, 7 * k);
  if (freq === "biweekly") return oAdd(start, 14 * k);
  if (freq === "fourweek") return oAdd(start, 28 * k);
  // Monthly: same week and weekday ("3rd Thursday"). A 5th weekday falls back to the 4th.
  const d = oP(start);
  const wd = d.getUTCDay();
  const n = Math.ceil(d.getUTCDate() / 7);
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1));
  const dim = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  let day = 1 + ((wd - first.getUTCDay() + 7) % 7) + 7 * (n - 1);
  if (day > dim) day -= 7;
  return oS(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)));
};

/** How many cleans a plan has. "No end date" places a year ahead; more are added as it runs. */
export const oCount = (type: Plan["type"], freq: OFreq, term: Term) => {
  if (type === "once") return 1;
  if (term === "none") return { weekly: 52, biweekly: 26, fourweek: 13, monthly: 12 }[freq];
  const t = Number(term);
  if (freq === "weekly") return Math.round((t * 52) / 12);
  if (freq === "biweekly") return Math.floor((t * 52) / 12 / 2) + 1;
  if (freq === "fourweek") return Math.floor((t * 52) / 12 / 4) + 1;
  return t;
};

const fmtClock = (t: string) => {
  const p = (t || "13:00").split(":");
  let h = Number(p[0]);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${p[1] || "00"} ${ap}`;
};
export const oTime = (win: OWin, t?: string) => (win !== "custom" ? (O_WIN[win] ?? O_WIN.afternoon)[1] : fmtClock(t || "13:00"));
export const oHours = (win: OWin, t?: string): [number, number] => {
  if (win !== "custom") {
    const w = O_WIN[win] ?? O_WIN.afternoon;
    return [w[2], w[3]];
  }
  const p = (t || "13:00").split(":");
  const h = Number(p[0]) + Number(p[1] || 0) / 60;
  return [h, h + 3];
};
export const oMoney = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const oOrd = (n: number) => ["1st", "2nd", "3rd", "4th", "5th"][n - 1];
/** "Vista Meadows · Ocoee" from "1829 Vista Meadows Dr, Ocoee, FL 34761". */
export const oShortAddr = (addr: string) => {
  const parts = (addr || "").split(",");
  let st = (parts[0] || "").replace(/^\s*\d+\s+/, "").trim();
  st = st.replace(/\s+(\[[^\]]*\]|Dr|Ln|Ct|Ave|Blvd|Rd|St|Way|Ter|Pkwy|Cir|Pl|Trl)\.?$/i, "");
  const town = (parts[1] || "").trim();
  return (st ? st + (town ? " · " : "") : "") + town;
};
export const oTown = (addr: string) => ((addr || "").split(",")[1] || "").trim() || "Orlando";

/** US holidays a clean might land on: fixed dates plus Memorial Day, Labor Day and Thanksgiving. */
const holCache = new Map<number, Record<string, string>>();
const nthWd = (y: number, m: number, wd: number, n: number) => {
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  return oS(new Date(Date.UTC(y, m, 1 + ((wd - first + 7) % 7) + 7 * (n - 1))));
};
const lastWd = (y: number, m: number, wd: number) => {
  const last = new Date(Date.UTC(y, m + 1, 0));
  return oS(new Date(Date.UTC(y, m, last.getUTCDate() - ((last.getUTCDay() - wd + 7) % 7))));
};
export const holiday = (d: string): string => {
  const y = Number(d.slice(0, 4));
  let h = holCache.get(y);
  if (!h) {
    h = {
      [`${y}-01-01`]: "New Year's Day",
      [lastWd(y, 4, 1)]: "Memorial Day",
      [`${y}-07-04`]: "Independence Day",
      [nthWd(y, 8, 1, 1)]: "Labor Day",
      [nthWd(y, 10, 4, 4)]: "Thanksgiving",
      [`${y}-12-25`]: "Christmas",
    };
    holCache.set(y, h);
  }
  return h[d] ?? "";
};

export const fullName = (c: Pick<OpsCustomer, "first" | "lastName">) => (c.first + (c.lastName ? " " + c.lastName : "")).trim();
export const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] || "", lastName: parts.slice(1).join(" ") };
};
export const planName = (p: Plan | null) =>
  !p ? "" : p.type === "once" ? "One-time clean" : O_FREQ[p.freq] + " · " + (p.term === "none" ? "no end date" : p.term + "-month plan");

const rnd = () => Math.random().toString(36).slice(2, 8);
export const newId = (prefix = "v") => prefix + Date.now().toString(36).slice(-5) + rnd();

/** The visits a plan places, from `from`, `n` cleans. */
export const genVisits = (plan: Plan, from: string, n: number): Visit[] => {
  const out: Visit[] = [];
  for (let k = 0; k < n; k++) {
    out.push({ id: newId(), date: oStep(plan.type === "once" ? "weekly" : plan.freq, from, k), win: plan.win, t: plan.t, status: "scheduled", price: plan.price, paid: "", note: "", priv: "" });
  }
  return out;
};

export const countable = (v: Visit) => v.status === "scheduled" || v.status === "done" || v.status === "rescheduled" || v.status === "paused";
export const byDate = (a: { date: string }, b: { date: string }) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

export type CustStatus = "Active" | "Pending pick" | "Ending soon" | "Ended" | "Paused" | "Cancelled";

/** Progress and status of a customer's plan, as the design defines them. */
export function planStats(c: OpsCustomer, today: string) {
  const cnt = c.visits.filter((v) => !v.oneOff && countable(v)).sort(byDate);
  const done = cnt.filter((v) => v.status === "done").length;
  const total = cnt.length;
  const end = total ? cnt[total - 1].date : "";
  const nextReal = c.visits.filter((v) => v.date >= today && (v.status === "scheduled" || v.status === "rescheduled")).sort(byDate)[0];
  const nextPend = c.pending && c.pending.date >= today ? { date: c.pending.date, win: c.pending.win, t: c.pending.t, pending: true } : undefined;
  const next = [nextReal, nextPend].filter(Boolean).sort((a, b) => byDate(a!, b!))[0] as { date: string; win: OWin; t: string; pending?: boolean } | undefined;
  const p = c.plan;
  let status: CustStatus = "Active";
  if (c.pending && !p) status = "Pending pick";
  else if (c.cancelled) status = "Cancelled";
  else if (c.paused) status = "Paused";
  else if (!p || total - done <= 0) status = "Ended";
  else if (
    p.type !== "once" &&
    p.term !== "none" &&
    (((p.freq === "weekly" || p.freq === "biweekly") && total - done <= 2) || (end && oDiff(today, end) <= 21))
  )
    status = "Ending soon";
  return { cnt, done, total, left: total - done, end, next, status, renewal: end ? oAdd(end, 28) : "" };
}
export type PlanStats = ReturnType<typeof planStats>;
