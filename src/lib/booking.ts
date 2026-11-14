/**
 * Booking links: shared types, labels and formatting.
 * Safe to import from client and server code (no storage here, see bookingStore.ts).
 */

export type OptionType = "once" | "plan";
export type Freq = "weekly" | "biweekly" | "fourweek";
export type Term = "1" | "3" | "6" | "12" | "none";
export type Win = "morning" | "midday" | "afternoon" | "custom";
export type Expires = "never" | "1" | "3" | "7";
export type LinkStatus = "sent" | "viewed" | "booked" | "cancelled";
export type ShownStatus = LinkStatus | "expired";

export type PriceOption = {
  id: string;
  type: OptionType;
  freq: Freq;
  term: Term;
  price: string;
  name: string;
  note: string;
  badge: "" | "Most popular" | "Best value";
};

export type Customer = {
  name: string;
  phone: string;
  email: string;
  addr: string;
  zip: string;
  addrNotes: string;
  type: "home" | "rental";
  beds: number;
  baths: number;
  size: string;
  last: string;
  plan: string;
  extras: string[];
  notes: string;
};

/** What the admin form edits. */
export type LinkInput = {
  qid: string;
  cust: Customer;
  date: string; // YYYY-MM-DD
  win: Win;
  cStart: string; // HH:MM
  cEnd: string;
  options: PriceOption[];
  sentBy: string;
  msg: string;
  expires: Expires;
};

export type BookingLink = LinkInput & {
  id: string;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  viewedAt?: string;
  picked?: string;
  bookedAt?: string;
  bookedPhone?: string;
  textMe?: boolean;
  /** Status before the link was cancelled, so "Undo" can put it back. */
  prevStatus?: LinkStatus;
};

/** What the customer page receives. */
export type PublicLink = Pick<BookingLink, "id" | "cust" | "date" | "win" | "cStart" | "cEnd" | "options" | "sentBy" | "msg" | "picked" | "bookedPhone"> & {
  status: ShownStatus;
};

export const shownStatus = (l: Pick<BookingLink, "status" | "expiresAt">, now = Date.now()): ShownStatus =>
  l.status !== "booked" && l.status !== "cancelled" && l.expiresAt && Date.parse(l.expiresAt) < now ? "expired" : l.status;

export const toPublic = (l: BookingLink): PublicLink => ({
  id: l.id,
  cust: { ...l.cust, email: "" },
  date: l.date,
  win: l.win,
  cStart: l.cStart,
  cEnd: l.cEnd,
  options: l.options,
  sentBy: l.sentBy,
  msg: l.msg,
  picked: l.picked,
  bookedPhone: l.bookedPhone,
  status: shownStatus(l),
});

/** Extras from the quote page: key, name, what's included. */
export const EXTRAS: [string, string, string][] = [
  ["sheets", "Bed sheet change", "Fresh sheets on every bed"],
  ["fridge", "Inside the fridge", "Emptied, wiped and organized"],
  ["oven", "Inside the oven", "Racks, door and interior degreased"],
  ["windows", "Interior windows", "Glass, sills and tracks"],
  ["exterior", "Exterior cleaning", "Lanai, patio and entryway"],
  ["laundry", "Laundry", "One load washed, dried and folded"],
  ["cabinets", "Inside cabinets", "Emptied, wiped and put back"],
  ["baseboards", "Baseboards and blinds", "Hand-wiped throughout"],
  ["garage", "Garage sweep", "Floor swept, cobwebs cleared"],
  ["pet", "Pet hair treatment", "Extra vacuuming and lint removal"],
  ["linen", "Linen change and restock", "Beds made hotel-style, spares staged"],
  ["supplies", "Guest supplies restock", "Paper goods, soap and coffee from your stock"],
  ["damage", "Damage and inventory photo report", "Every room photographed for you"],
];
export const extraName = (k: string) => EXTRAS.find((e) => e[0] === k)?.[1] ?? k;
export const extraDesc = (k: string) => EXTRAS.find((e) => e[0] === k)?.[2] ?? "";
export const extraKey = (label: string) => EXTRAS.find((e) => e[1] === label || e[0] === label)?.[0] ?? label;

export const FREQ: [Freq, string, number][] = [
  ["weekly", "Every week", 1],
  ["biweekly", "Every 2 weeks", 2],
  ["fourweek", "Every 4 weeks", 4],
];
export const freqOf = (k: string) => FREQ.find((x) => x[0] === k) ?? FREQ[1];
export const TERMS: [Term, string][] = [
  ["1", "1 month"],
  ["3", "3 months"],
  ["6", "6 months"],
  ["12", "12 months"],
  ["none", "No end date"],
];
export const WINS: [Win, string, string, string, string][] = [
  ["morning", "Morning · 8–11 am", "8–11 am", "08:00", "11:00"],
  ["midday", "Midday · 11 am–2 pm", "11 am–2 pm", "11:00", "14:00"],
  ["afternoon", "Afternoon · 2–5 pm", "2–5 pm", "14:00", "17:00"],
  ["custom", "Custom", "", "", ""],
];
export const EXPIRES: [Expires, string][] = [
  ["never", "Never"],
  ["1", "1 day"],
  ["3", "3 days"],
  ["7", "7 days"],
];
export const SIZES = ["Under 1,000 sq ft", "1,000–1,499 sq ft", "1,500–1,999 sq ft", "2,000–2,499 sq ft", "2,500–2,999 sq ft", "3,000–3,999 sq ft", "4,000+ sq ft"];
export const LASTS = ["Within 2 weeks", "2 to 4 weeks", "1 to 3 months", "More than 3 months", "Never"];
export const PLANS = ["Every week", "Every 2 weeks", "Monthly", "One time", "Turnover plan, calendar synced", "Per turnover, as booked"];

export const autoName = (o: Pick<PriceOption, "type" | "freq" | "term">) =>
  o.type === "once" ? "One-time clean" : o.term === "none" ? `${freqOf(o.freq)[1]} plan` : `${o.term}-month plan · ${freqOf(o.freq)[1].toLowerCase()}`;

export const num = (p: string) => Number(String(p || "").replace(/[^0-9.]/g, "")) || 0;
export const money = (p: string) => "$" + (String(p || "").replace(/^\$/, "") || "—");

const fmtT = (t: string) => {
  const p = (t || "00:00").split(":");
  let h = Number(p[0]);
  const m = p[1] || "00";
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}${m !== "00" ? ":" + m : ""} ${ap}`;
};

/** Start and end of the arrival window as HH:MM. */
export const winTimes = (l: Pick<LinkInput, "win" | "cStart" | "cEnd">): [string, string] => {
  if (l.win === "custom") return [l.cStart || "14:00", l.cEnd || "17:00"];
  const w = WINS.find((x) => x[0] === l.win) ?? WINS[2];
  return [w[3], w[4]];
};

export function winLabels(l: Pick<LinkInput, "win" | "cStart" | "cEnd">) {
  const [s, e] = winTimes(l);
  const a = fmtT(s);
  const b = fmtT(e);
  const sameAp = a.slice(-2) === b.slice(-2);
  const from = sameAp ? a.slice(0, -3) : a;
  return { short: `${from}–${b}`, long: `Arrival between ${from} and ${b}` };
}

export function dateLabel(iso: string, o: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  if (!iso) return "No date";
  const p = iso.split("-").map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2] || 1)).toLocaleDateString("en-US", { timeZone: "UTC", ...o });
}

export const optSummary = (l: Pick<LinkInput, "options">) =>
  l.options.map((o) => `${money(o.price)} ${o.type === "plan" ? freqOf(o.freq)[1].toLowerCase() : "one-time"}`).join(" · ");

export const bathsLabel = (n: number) => (n >= 6 ? "6+" : Math.floor(n) + (n % 1 ? "½" : ""));
export const bedsLabel = (n: number) => (n === 0 ? "Studio" : n >= 6 ? "6+" : String(n));

export const digits = (p: string) => String(p || "").replace(/\D/g, "");
/** "+1XXXXXXXXXX" for US numbers. */
export const e164 = (p: string) => {
  const d = digits(p);
  return d.length === 10 ? `+1${d}` : d ? `+${d}` : "";
};
export const fmtPhone = (p: string) => {
  const d = digits(p).replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
};

/** Address as shown to the customer: street plus ZIP if it isn't already there. */
export const addrLine = (c: Pick<Customer, "addr" | "zip">) => {
  const a = (c.addr || "").replace(/,?\s*\bFL\b\.?/i, "").replace(/\s+/g, " ").replace(/[\s,]+$/, "").trim();
  return c.zip && !a.includes(c.zip) ? `${a} ${c.zip}`.trim() : a;
};

export const blankCustomer = (): Customer => ({
  name: "",
  phone: "",
  email: "",
  addr: "",
  zip: "",
  addrNotes: "",
  type: "home",
  beds: 2,
  baths: 2,
  size: "1,000–1,499 sq ft",
  last: "1 to 3 months",
  plan: "One time",
  extras: [],
  notes: "",
});

/** A quote request, ready for the "Create booking link" picker. */
export type QuotePick = {
  qid: string;
  received: string;
  zip: string;
  days: string[];
  wins: string[];
  cust: Customer;
};

/** Status tag in the admin list: Sent, Viewed, Booked · option, Expired, Cancelled. */
export const tagFor = (l: BookingLink) => {
  const st = shownStatus(l);
  if (st === "booked") {
    const o = l.options.find((x) => x.id === l.picked);
    return "Booked" + (o ? ` · ${o.name}` : "");
  }
  return { sent: "Sent", viewed: "Viewed", expired: "Expired", cancelled: "Cancelled" }[st];
};

const rid = () => "o" + Math.random().toString(36).slice(2, 7);
export const newOpt = (): PriceOption => ({ id: rid(), type: "once", freq: "biweekly", term: "3", price: "", name: "One-time clean", note: "", badge: "" });
export const blankInput = (): LinkInput => ({
  qid: "",
  cust: blankCustomer(),
  date: "",
  win: "afternoon",
  cStart: "14:00",
  cEnd: "17:00",
  options: [newOpt()],
  sentBy: "Kyle",
  msg: "",
  expires: "3",
});
export const fromQuote = (q: QuotePick): LinkInput => ({
  ...blankInput(),
  qid: q.qid,
  cust: JSON.parse(JSON.stringify(q.cust)),
  win: (["morning", "midday", "afternoon"] as const).find((w) => w === q.wins[0]) ?? "afternoon",
  msg: `Hi ${q.cust.name.trim().split(" ")[0]}! Here's your price. Pick the option that works for you and tap confirm.`,
});
