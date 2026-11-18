"use client";

/**
 * Admin home: Calendar and Customers. Ported from the Claude Design export (website-design/calendar.html).
 * Every change is saved right away (one customer at a time) through saveCustomerAction.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logout } from "@/app/admin/actions";
import { bookPendingAction, saveCustomerAction } from "@/app/admin/opsActions";
import { Roofline } from "@/components/brand";
import { digits, e164, extraName, SIZES, type QuotePick, type Term } from "@/lib/booking";
import {
  FREQ_CHOICES,
  O_EXTRAS,
  O_FREQ,
  O_FSHORT,
  O_WIN,
  TERM_CHOICES,
  byDate,
  countable,
  fullName,
  genVisits,
  holiday,
  newId,
  oAdd,
  oCount,
  oF,
  oHours,
  oMD,
  oMoney,
  oOrd,
  oP,
  oS,
  oShort,
  oShortAddr,
  oStep,
  oTime,
  oTown,
  planName,
  planStats,
  splitName,
  type CustStatus,
  type OFreq,
  type OpsCustomer,
  type OWin,
  type Paid,
  type PendingOption,
  type Plan,
  type PlanStats,
  type Visit,
} from "@/lib/ops";
import "./ops.css";

type View = "cal" | "customers" | "customer" | "add";
type Mode = "day" | "week" | "month";
type VMode = "detail" | "done" | "resched" | "skip" | "cancel" | "book";
type Sheet =
  | { kind: "visit"; vid: string; mode: VMode }
  | { kind: "fab" }
  | { kind: "addVisit" }
  | { kind: "renew" | "change" | "cancelPlan"; cid: string }
  | null;
type CV = Visit & { cid: string; tentative?: boolean };
type Toast = { text: string; actLabel?: string; act?: () => void; href?: string; hrefLabel?: string } | null;
type Tmp = Record<string, string | boolean | undefined>;
type Form = {
  src: string;
  qid: string;
  name: string;
  phone: string;
  email: string;
  addr: string;
  addrNotes: string;
  type: "home" | "rental";
  beds: number;
  baths: number;
  size: string;
  pets: string;
  extras: string[];
  important: string;
  quoteNotes: string;
  lastClean: string;
  planType: "once" | "plan";
  freq: OFreq;
  term: Term;
  price: string;
  start: string;
  win: OWin;
  t: string;
  editing: string;
};

const blankForm = (): Form => ({
  src: "",
  qid: "",
  name: "",
  phone: "",
  email: "",
  addr: "",
  addrNotes: "",
  type: "home",
  beds: 2,
  baths: 2,
  size: "1,000–1,499 sq ft",
  pets: "",
  extras: [],
  important: "",
  quoteNotes: "",
  lastClean: "",
  planType: "plan",
  freq: "biweekly",
  term: "3",
  price: "",
  start: "",
  win: "afternoon",
  t: "13:00",
  editing: "",
});

const TAG_CLS: Record<CustStatus, string> = {
  Active: "tag s-active",
  "Pending pick": "tag s-pending",
  "Ending soon": "tag s-ending",
  Ended: "tag s-ended",
  Paused: "tag s-paused",
  Cancelled: "tag s-cancelled",
};
const V_TAG: Record<Visit["status"], string> = {
  scheduled: "Scheduled",
  done: "Done",
  skipped: "Skipped",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  pending: "Pending pick",
  paused: "Paused",
};
/** " ($174 first)" when the first visit of a plan costs something else. */
const firstTag = (o: { type: string; first?: string }) => (o.type === "plan" && Number(o.first) ? " ($" + o.first + " first)" : "");
/** "$119 per clean", or "$174 first clean, then $119 per clean". */
const perClean = (o: { type: string; price: string; first?: string }) =>
  o.type !== "plan" ? "$" + o.price : Number(o.first) ? "$" + o.first + " first clean, then $" + o.price + " per clean" : "$" + o.price + " per clean";
const optShort = (o: PendingOption) => "$" + o.price + (o.type === "once" ? "" : "/" + O_FSHORT[o.freq]) + firstTag(o);
const optLong = (o: PendingOption) => "$" + o.price + (o.type === "once" ? " once" : " " + O_FREQ[o.freq].toLowerCase() + (o.term !== "none" ? " (" + o.term + "-month)" : "")) + firstTag(o);
const optLine = (o: PendingOption) => o.name + " · " + perClean(o);
const sumPrice = (list: Visit[]) => list.reduce((a, v) => a + (Number(v.price) || 0), 0);
const bathsL = (n: number) => (Number(n) ? Math.floor(n) + (n % 1 ? "½" : "") : "Not set");
const tel = (p: string) => "tel:" + e164(p);
const sms = (p: string, body?: string) => "sms:" + e164(p) + (body ? "?&body=" + encodeURIComponent(body) : "");
const wa = (p: string) => "https://wa.me/" + digits(e164(p));
const maps = (a: string) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a);
const cleanPrice = (p: string) => String(p || "").replace(/[^0-9.]/g, "");
const nextOf = (freq: OFreq, d: string) => oStep(freq, d, 1);

/* ---------- Icons ---------- */
const Leaf = ({ size = 16, w = 2 }: { size?: number; w?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#7A5D27" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7" />
  </svg>
);
const Chev = ({ dir }: { dir: "l" | "r" }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0E1F3D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "l" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
  </svg>
);
const CalIcon = ({ stroke = "#0E1F3D" }: { stroke?: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
  </svg>
);
const Tick = () => (
  <span className="tick" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0E1F3D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
  </span>
);
const NAV_ICONS = {
  cal: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  cust: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.5 3.2-6 6.5-6s6 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2 .7 3.3 3 3.5 6",
  links: "M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1",
  subs: "M4 13h4l2 3h4l2-3h4M4 13l2.5-8h11L20 13v6H4z",
  prices: "M3 12V4h8l10 10-8 8zM7.5 8h.01",
};
const NavIcon = ({ d, on }: { d: string; on?: boolean }) => (
  <span className="bti">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={on ? "#0E1F3D" : "#5B6474"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  </span>
);

type Chip = { label: string; on: boolean; pick: () => void };
const Chips = ({ list, label, cls = "chips" }: { list: Chip[]; label: string; cls?: string }) => (
  <div className={cls} role="group" aria-label={label}>
    {list.map((t) => (
      <button key={t.label} type="button" className={t.on ? "chip sel" : "chip"} aria-pressed={t.on} onClick={t.pick}>
        {t.label}
      </button>
    ))}
  </div>
);
const Seg = ({ list, label, style, cls = "seg" }: { list: Chip[]; label: string; style?: React.CSSProperties; cls?: string }) => (
  <div className={cls} role="group" aria-label={label} style={style}>
    {list.map((m) => (
      <button key={m.label} type="button" className={m.on ? "segb on" : "segb"} aria-pressed={m.on} onClick={m.pick}>
        {m.label}
      </button>
    ))}
  </div>
);
type Radio = { t: string; d: string; on: boolean; pick: () => void };
const Radios = ({ list, label }: { list: Radio[]; label: string }) => (
  <div className="menu" role="radiogroup" aria-label={label}>
    {list.map((o) => (
      <button key={o.t} type="button" className={o.on ? "rcard sel" : "rcard"} role="radio" aria-checked={o.on} onClick={o.pick}>
        {o.on ? <Tick /> : <span className="ring" aria-hidden="true" />}
        <span className="t">{o.t}</span>
        <span className="d">{o.d}</span>
      </button>
    ))}
  </div>
);
const KV = ({ rows }: { rows: { k: string; v: React.ReactNode }[] }) => (
  <ul className="kv">
    {rows.map((r) => (
      <li key={r.k}>
        <span className="k">{r.k}</span>
        <span className="v">{r.v}</span>
      </li>
    ))}
  </ul>
);
const winChips = (cur: OWin, pick: (w: OWin) => void): Chip[] =>
  (["morning", "midday", "afternoon", "custom"] as OWin[]).map((w) => ({ label: w === "custom" ? "Custom" : O_WIN[w][0] + " · " + O_WIN[w][1], on: cur === w, pick: () => pick(w) }));
const termChips = (cur: Term, pick: (t: Term) => void): Chip[] => TERM_CHOICES.map((t) => ({ label: t[1], on: cur === t[0], pick: () => pick(t[0]) }));
const freqChips = (cur: OFreq, pick: (f: OFreq) => void): Chip[] =>
  (FREQ_CHOICES.includes(cur) ? FREQ_CHOICES : [...FREQ_CHOICES, cur]).map((f) => ({ label: O_FREQ[f], on: cur === f, pick: () => pick(f) }));
const listPreview = (dates: string[], price: string, first?: string) => {
  if (!dates.length) return "";
  const shown = dates.length <= 4 ? dates.map(oMD).join(", ") : dates.slice(0, 3).map(oMD).join(", ") + " … " + oMD(dates[dates.length - 1]);
  return dates.length + (dates.length === 1 ? " clean: " : " cleans: ") + shown + " · ends " + oMD(dates[dates.length - 1]) + " · ~" + oMoney(dates.length * (Number(price) || 0) + (Number(first) ? Number(first) - (Number(price) || 0) : 0));
};
const planDates = (type: Plan["type"], freq: OFreq, term: Term, start: string, cap?: number) => {
  const n = oCount(type, freq, term);
  const out: string[] = [];
  for (let k = 0; k < Math.min(n, cap ?? n); k++) out.push(oStep(type === "once" ? "weekly" : freq, start, k));
  return out;
};

export function OpsApp({
  initial,
  today,
  startView,
  startCid,
  quotes,
  siteUrl,
  storageOk,
}: {
  initial: OpsCustomer[];
  today: string;
  startView: "cal" | "customers" | "customer";
  startCid?: string;
  quotes: QuotePick[];
  siteUrl: string;
  storageOk: boolean;
}) {
  /* ---------- State ---------- */
  const [custs, setCustsState] = useState<OpsCustomer[]>(initial);
  const custsRef = useRef(custs);
  const setCusts = useCallback((next: OpsCustomer[]) => {
    custsRef.current = next;
    setCustsState(next);
  }, []);
  const [mobile, setMobile] = useState(false);
  const [view, setView] = useState<View>(startCid && initial.some((c) => c.id === startCid) ? "customer" : startView === "customer" ? "customers" : startView);
  const [mode, setMode] = useState<Mode>("week");
  const [sel, setSel] = useState(today);
  const [cid, setCid] = useState(startCid ?? "");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("next");
  const [toast, setToastState] = useState<Toast>(null);
  const [flash, setFlash] = useState("");
  const [tmp, setTmp] = useState<Tmp>({});
  const [form, setForm] = useState<Form | null>(null);
  const [fq, setFq] = useState("");
  const [fErr, setFErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const tt = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ft = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tx = useRef<number | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToastState(t);
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToastState(null), 5000);
  }, []);
  const flashVisit = (id: string) => {
    setFlash(id);
    clearTimeout(ft.current);
    ft.current = setTimeout(() => setFlash(""), 2800);
  };

  useEffect(() => {
    const measure = () => {
      if (rootRef.current) setMobile(rootRef.current.clientWidth < 900);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" && rootRef.current ? new ResizeObserver(measure) : null;
    if (ro && rootRef.current) ro.observe(rootRef.current);
    return () => {
      ro?.disconnect();
      clearTimeout(tt.current);
      clearTimeout(ft.current);
    };
  }, []);

  // Keep the address bar in step, so refresh and sharing land on the same screen.
  useEffect(() => {
    const url = view === "customers" ? "/admin/customers" : view === "customer" && cid ? `/admin/customers?c=${encodeURIComponent(cid)}` : view === "cal" ? "/admin" : null;
    if (url && window.location.pathname + window.location.search !== url) window.history.replaceState(null, "", url);
    mainRef.current?.scrollTo({ top: 0 });
  }, [view, cid]);

  /* ---------- Saving ---------- */
  const queue = useRef<Record<string, { inflight: boolean; again: boolean; timer?: ReturnType<typeof setTimeout> }>>({});
  const [pendingSaves, setPendingSaves] = useState(0);
  const flush = useCallback(
    async (id: string) => {
      const slot = (queue.current[id] ??= { inflight: false, again: false });
      if (slot.inflight) {
        slot.again = true;
        return;
      }
      const c = custsRef.current.find((x) => x.id === id);
      if (!c) return;
      slot.inflight = true;
      setPendingSaves((n) => n + 1);
      const body: OpsCustomer = { ...c, pending: undefined, virtual: undefined };
      const res = await saveCustomerAction(body).catch(() => ({ ok: false as const, error: "Could not save. Check your connection and try again.", customer: undefined }));
      slot.inflight = false;
      setPendingSaves((n) => n - 1);
      if (res.ok) {
        setCusts(custsRef.current.map((x) => (x.id === id ? { ...x, rev: res.customer.rev, virtual: false } : x)));
      } else {
        if (res.customer) {
          const fresh = res.customer;
          setCusts(custsRef.current.map((x) => (x.id === id ? { ...fresh, pending: x.pending } : x)));
          slot.again = false;
        }
        showToast({ text: res.error });
      }
      if (slot.again) {
        slot.again = false;
        void flush(id);
      }
    },
    [setCusts, showToast],
  );
  const persist = useCallback(
    (id: string, delay = 0) => {
      const slot = (queue.current[id] ??= { inflight: false, again: false });
      clearTimeout(slot.timer);
      if (delay) slot.timer = setTimeout(() => void flush(id), delay);
      else void flush(id);
    },
    [flush],
  );
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pendingSaves > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pendingSaves]);

  /** Change one customer and save it. */
  const mutate = (id: string, fn: (c: OpsCustomer) => OpsCustomer, delay = 0) => {
    const cur = custsRef.current.find((c) => c.id === id);
    if (!cur) return;
    const next = { ...fn(cur), updatedAt: new Date().toISOString() };
    setCusts(custsRef.current.map((c) => (c.id === id ? next : c)));
    persist(id, delay);
  };
  const hist = (t: string, d = today) => (c: OpsCustomer) => ({ ...c, history: c.history.concat([{ d, t }]) });
  const setVisit = (c: OpsCustomer, vid: string, p: Partial<Visit>) => ({ ...c, visits: c.visits.map((v) => (v.id === vid ? { ...v, ...p } : v)) });

  /* ---------- Derived ---------- */
  const custById = (id: string) => custs.find((c) => c.id === id);
  const statMap = useMemo(() => {
    const m: Record<string, PlanStats> = {};
    custs.forEach((c) => (m[c.id] = planStats(c, today)));
    return m;
  }, [custs, today]);
  const allVisits: CV[] = useMemo(() => {
    const out: CV[] = [];
    custs.forEach((c) => {
      c.visits.forEach((v) => out.push({ ...v, cid: c.id }));
      if (c.pending) out.push({ id: "t-" + c.pending.link, cid: c.id, date: c.pending.date, win: c.pending.win, t: c.pending.t, status: "pending", tentative: true, price: "", paid: "", note: "", priv: "" });
    });
    return out;
  }, [custs]);
  const visitN = (v: CV) => {
    const i = statMap[v.cid]?.cnt.findIndex((x) => x.id === v.id) ?? -1;
    return i >= 0 ? i + 1 : 0;
  };
  const planTag = (v: CV) => {
    const c = custById(v.cid)!;
    if (v.tentative) return "Pending pick · " + (c.pending?.options ?? []).map(optShort).join(" or ");
    if (v.oneOff) return "One-off visit";
    if (!c.plan || c.plan.type === "once") return "One-time";
    const n = visitN(v);
    return O_FREQ[c.plan.freq] + (n ? " · " + n + (c.plan.term === "none" ? "" : " of " + statMap[v.cid].total) : "");
  };
  const isRenew = (v: CV) => {
    const st = statMap[v.cid];
    return st.status === "Ending soon" && st.cnt.length > 0 && st.cnt[st.cnt.length - 1].id === v.id;
  };
  const live = (v: CV) => v.status !== "cancelled" && v.status !== "skipped";
  const onCal = (v: CV) => v.status !== "paused";
  const dayVisits = (d: string) => allVisits.filter((v) => v.date === d && onCal(v)).sort((a, b) => oHours(a.win, a.t)[0] - oHours(b.win, b.t)[0]);
  const openVisit = (v: CV) => () => {
    setSheet({ kind: "visit", vid: v.id, mode: "detail" });
    setTmp({});
    setCopied(false);
  };
  const vcard = (v: CV) => {
    const c = custById(v.cid)!;
    const hol = holiday(v.date);
    return {
      time: oTime(v.win, v.t),
      name: fullName(c),
      short: oShortAddr(c.addr),
      planTag: planTag(v),
      price: v.price && Number(v.price) ? "$" + v.price : "",
      tag: V_TAG[v.status],
      tagCls: "tag s-" + v.status,
      important: c.important || "",
      holiday: hol && !v.tentative && live(v) ? hol + " · Holiday, reschedule?" : hol,
      renew: isRenew(v),
    };
  };

  const week = useMemo(() => {
    const wStart = oAdd(sel, -oP(sel).getUTCDay());
    return [0, 1, 2, 3, 4, 5, 6].map((i) => oAdd(wStart, i));
  }, [sel]);
  const sumOf = (list: CV[]) => list.filter((v) => !v.tentative && live(v)).reduce((a, v) => a + (Number(v.price) || 0), 0);
  const wVis = allVisits.filter((v) => v.date >= week[0] && v.date <= week[6] && onCal(v));
  const wConf = wVis.filter((v) => !v.tentative && live(v));
  const wPend = wVis.filter((v) => v.tentative).length;
  const mKey = sel.slice(0, 7);
  const mVis = allVisits.filter((v) => v.date.slice(0, 7) === mKey && onCal(v));

  /* ---------- Navigation ---------- */
  const goView = (v: View) => () => {
    setView(v);
    if (mobile || v !== "cal") setSheet(null);
    setToastState(null);
  };
  const openCust = (id: string) => {
    setCid(id);
    setView("customer");
    setSheet(null);
  };

  /* ---------- Sheet: visit ---------- */
  const sv0 = sheet?.kind === "visit" ? allVisits.find((v) => v.id === sheet.vid) : undefined;
  const svC = sv0 ? custById(sv0.cid) : undefined;
  const vmode: VMode | "" = sheet?.kind === "visit" ? sheet.mode : "";
  const setVMode = (m: VMode, t?: Tmp) => {
    if (sheet?.kind !== "visit") return;
    setSheet({ ...sheet, mode: m });
    setTmp({ ...tmp, ...(t ?? {}) });
  };
  const setT = (o: Tmp) => setTmp({ ...tmp, ...o });
  const tStr = (k: string, d = "") => (typeof tmp[k] === "string" ? (tmp[k] as string) : d);
  const onTmp = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setT({ [k]: e.target.value });

  const rWinCur = (tStr("rWin") || "afternoon") as OWin;
  const rMsg =
    sv0 && svC
      ? "Hi " + svC.first + ", this is Crystal Clean. Your clean is moving to " + (tStr("rDate") ? oF(tStr("rDate"), { weekday: "long", month: "short", day: "numeric" }) : "…") + ", " + (rWinCur === "custom" ? "arriving at " + oTime("custom", tStr("rT")) : "arriving " + oTime(rWinCur)) + ". Reply if that doesn’t work."
      : "";
  const sPush = tmp.sPush !== false;
  const sMsg =
    sv0 && svC ? "Hi " + svC.first + ", this is Crystal Clean. We’ll skip your clean on " + oShort(sv0.date) + "." + (sPush && svC.plan && svC.plan.type !== "once" ? " Your plan keeps the same number of cleans, with one more added at the end." : "") + " See you next time!" : "";
  const bookUrl = (link: string) => `${siteUrl}/book/${link}`;

  /** Add one clean at the end of the plan (skip with "push the plan"). */
  const pushVisit = (c: OpsCustomer): OpsCustomer => {
    const cnt = c.visits.filter((v) => !v.oneOff && countable(v)).sort(byDate);
    const last = cnt[cnt.length - 1];
    if (!last || !c.plan || c.plan.type === "once") return c;
    return { ...c, visits: c.visits.concat([{ id: newId(), date: nextOf(c.plan.freq, last.date), win: c.plan.win, t: c.plan.t, status: "scheduled", price: c.plan.price, paid: "", note: "", priv: "" }]) };
  };

  const bOpts = sv0?.tentative && svC?.pending ? svC.pending.options : [];
  const bSel = bOpts.find((o) => o.id === tmp.bOpt);
  let bookPreview = "";
  if (bSel && sv0) {
    const ongoing = bSel.term === "none" && bSel.type !== "once";
    const dates = planDates(bSel.type, bSel.freq, bSel.term, sv0.date, ongoing ? 4 : undefined);
    const hol = dates.filter((d) => holiday(d));
    bookPreview = ongoing
      ? O_FREQ[bSel.freq] + " from " + oMD(sv0.date) + ", ongoing · " + perClean(bSel)
      : "Places " + listPreview(dates, bSel.price, bSel.first) + (hol.length ? " · " + hol.map((d) => oMD(d) + " is " + holiday(d)).join(", ") : "");
  }

  /* ---------- Sheet: renew / change / cancel plan ---------- */
  const rc = sheet && (sheet.kind === "renew" || sheet.kind === "change" || sheet.kind === "cancelPlan") ? custById(sheet.cid) : undefined;
  const rst = rc ? statMap[rc.id] : undefined;

  /* ---------- Customers list ---------- */
  const matches = (k: string, st: CustStatus) =>
    k === "all" || (k === "active" && st === "Active") || (k === "pending" && st === "Pending pick") || (k === "ending" && st === "Ending soon") || (k === "ended" && (st === "Ended" || st === "Cancelled"));
  const qOn = (c: OpsCustomer) => {
    const s = q.trim().toLowerCase();
    return !s || fullName(c).toLowerCase().includes(s) || c.addr.toLowerCase().includes(s) || (!!digits(s) && digits(c.phone).includes(digits(s)));
  };
  const sorted = custs
    .filter((c) => matches(filter, statMap[c.id].status))
    .filter(qOn)
    .sort((a, b) => {
      if (sort === "name") return fullName(a).localeCompare(fullName(b));
      if (sort === "renewal") return (statMap[a.id].renewal || "9999").localeCompare(statMap[b.id].renewal || "9999");
      return (statMap[a.id].next?.date || "9999").localeCompare(statMap[b.id].next?.date || "9999");
    });
  const ending = custs.filter((c) => statMap[c.id].status === "Ending soon");
  const showEnding = ending.length > 0 && filter === "all" && !q.trim();

  /* ---------- Add / edit form ---------- */
  const fm = form ?? blankForm();
  const setFm = (o: Partial<Form>) => {
    setForm({ ...fm, ...o });
    setFErr("");
  };
  const fonStr = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFm({ [k]: e.target.value } as Partial<Form>);
  const fOngoing = fm.planType !== "once" && fm.term === "none";
  const fDates = fm.start ? planDates(fm.planType, fm.freq, fm.term, fm.start, fOngoing ? 4 : undefined) : [];
  const fPreview = !fm.start ? "Pick a first date to see the visits." : fOngoing ? O_FREQ[fm.freq] + " from " + oMD(fm.start) + ", ongoing · $" + (fm.price || "—") + " per clean" : listPreview(fDates, fm.price);
  const taken = (qp: QuotePick) => custs.some((c) => !c.virtual && (c.qid === qp.qid || (digits(qp.cust.phone).length >= 10 && digits(c.phone).endsWith(digits(qp.cust.phone).slice(-10)))));
  const sources = quotes
    .filter((qp) => !taken(qp))
    .filter((qp) => {
      const s = fq.trim().toLowerCase();
      return !s || qp.cust.name.toLowerCase().includes(s) || qp.cust.addr.toLowerCase().includes(s) || qp.zip.includes(s);
    })
    .slice(0, 8);
  const fillFromQuote = (qp: QuotePick) => {
    const c = qp.cust;
    const a = c.addr.trim();
    setFm({
      src: qp.qid,
      qid: qp.qid,
      name: c.name,
      phone: c.phone,
      email: c.email,
      addr: c.zip && !a.includes(c.zip) ? `${a}${a ? ", FL " : ""}${c.zip}` : a,
      addrNotes: c.addrNotes,
      type: c.type,
      beds: c.beds,
      baths: c.baths,
      size: c.size,
      extras: c.extras,
      quoteNotes: c.notes,
      lastClean: c.last,
      pets: "",
      important: "",
      planType: c.plan === "One time" ? "once" : "plan",
      freq: c.plan === "Every week" ? "weekly" : c.plan === "Monthly" ? "monthly" : "biweekly",
    });
  };

  const saveForm = () => {
    const { first, lastName } = splitName(fm.name);
    if (fm.editing) {
      if (!first) return setFErr("Add a name to save.");
      mutate(fm.editing, (c) => ({
        ...c,
        first,
        lastName,
        phone: fm.phone,
        email: fm.email,
        addr: fm.addr,
        addrNotes: fm.addrNotes,
        type: fm.type,
        beds: fm.beds,
        baths: fm.baths,
        size: fm.size,
        pets: fm.pets,
        extras: fm.extras,
        important: fm.important,
      }));
      setCid(fm.editing);
      setView("customer");
      setForm(null);
      return;
    }
    const miss: string[] = [];
    if (!first) miss.push("a name");
    if (!fm.addr.trim()) miss.push("an address");
    if (!Number(cleanPrice(fm.price))) miss.push("a price");
    if (!fm.start) miss.push("a first date");
    if (miss.length) return setFErr("Add " + miss.join(", ") + " to save.");
    const plan: Plan = { type: fm.planType, freq: fm.freq, term: fm.planType === "once" ? "1" : fm.term, price: cleanPrice(fm.price), win: fm.win, t: fm.t, start: fm.start };
    const nv = genVisits(plan, plan.start, oCount(plan.type, plan.freq, plan.term));
    const now = new Date().toISOString();
    const c: OpsCustomer = {
      id: newId("c").toLowerCase(),
      rev: 0,
      first,
      lastName,
      phone: fm.phone,
      email: fm.email,
      addr: fm.addr,
      addrNotes: fm.addrNotes,
      type: fm.type,
      beds: fm.beds,
      baths: fm.baths,
      size: fm.size,
      lastClean: fm.lastClean || "Not set",
      extras: fm.extras,
      pets: fm.pets,
      quoteNotes: fm.quoteNotes,
      important: fm.important,
      plan,
      history: [{ d: today, t: (fm.src ? "Added from quote request" : "Added by hand") + ": " + planName(plan) + " · $" + plan.price + (plan.type === "plan" ? " per clean" : "") }],
      visits: nv,
      linkIds: [],
      ...(fm.qid ? { qid: fm.qid } : {}),
      createdAt: now,
      updatedAt: now,
    };
    setCusts(custsRef.current.concat([c]));
    persist(c.id);
    setView("cal");
    setMode("week");
    setSel(plan.start);
    setForm(null);
    setSheet(null);
    flashVisit(nv[0].id);
    showToast({ text: first + " saved · " + nv.length + (nv.length === 1 ? " visit" : " visits") + " on the calendar" });
  };

  /* ---------- Customer detail ---------- */
  const cuC = view === "customer" ? custById(cid) : undefined;
  const editCust = () => {
    if (!cuC) return;
    setForm({
      ...blankForm(),
      editing: cuC.id,
      name: fullName(cuC),
      phone: cuC.phone,
      email: cuC.email,
      addr: cuC.addr,
      addrNotes: cuC.addrNotes,
      type: cuC.type,
      beds: cuC.beds,
      baths: cuC.baths || 2,
      size: cuC.size,
      pets: cuC.pets,
      extras: cuC.extras,
      important: cuC.important,
    });
    setView("add");
  };
  const openRenew = () => {
    const id = sv0 ? sv0.cid : cid;
    const c = custById(id);
    if (!c?.plan) return;
    setSheet({ kind: "renew", cid: id });
    setTmp({ nFreq: c.plan.freq, nTerm: c.plan.term === "none" ? "3" : c.plan.term, nPrice: c.plan.price });
  };

  /* ---------- Render helpers ---------- */
  const VisitCard = ({ v }: { v: CV }) => {
    const k = vcard(v);
    return (
      <button type="button" className={"vc" + (v.tentative ? " tent" : "") + (!live(v) ? " dim" : "") + (flash === v.id ? " flash" : "")} onClick={openVisit(v)}>
        <span className="vtop">
          <span className="vtime">{k.time}</span>
          <span className={k.tagCls}>{k.tag}</span>
        </span>
        <span className="vname">{k.name}</span>
        <span className="vaddr">{k.short}</span>
        {k.important && (
          <span className="imp">
            <Leaf />
            {k.important}
          </span>
        )}
        <span className="vmeta">
          <span className="ptag">{k.planTag}</span>
          {!v.tentative && k.price && <span className="vprice">{k.price}</span>}
        </span>
        {k.holiday && (
          <span className="hol">
            <i aria-hidden="true" />
            {k.holiday}
          </span>
        )}
        {k.renew && (
          <span className="hol">
            <i aria-hidden="true" />
            Last clean of the plan · Renew plan
          </span>
        )}
      </button>
    );
  };
  const DayList = () => {
    const list = dayVisits(sel);
    const n = list.filter(live).length;
    return (
      <>
        <div className="dayh">
          <h2 className="h2">
            {oF(sel, { weekday: "long", month: "long", day: "numeric" })}
            {sel === today ? " · Today" : ""}
          </h2>
          <span className="quiet">{n ? n + (n === 1 ? " visit" : " visits") : ""}</span>
        </div>
        <div className="list">
          {list.map((v) => (
            <VisitCard key={v.id} v={v} />
          ))}
          {!list.length && <div className="empty">Nothing booked. Tap + to add a clean.</div>}
        </div>
      </>
    );
  };

  const blocksFor = (d: string) => {
    const list = dayVisits(d);
    const lanes: number[] = [];
    const placed = list.map((v) => {
      const hh = oHours(v.win, v.t);
      let lane = 0;
      while (lanes[lane] && lanes[lane] > hh[0]) lane++;
      lanes[lane] = hh[1];
      return { v, hh, lane };
    });
    return placed.map((x) => {
      const nL = Math.max(...placed.filter((y) => y.hh[0] < x.hh[1] && y.hh[1] > x.hh[0]).map((y) => y.lane)) + 1;
      const top = Math.max(0, (x.hh[0] - 7) * 56) + 2;
      const ht = Math.max(56, (Math.min(x.hh[1], 19) - Math.max(x.hh[0], 7)) * 56) - 4;
      const w = 100 / nL;
      return { ...x, style: { top, height: ht, left: `calc(${w * x.lane}% + 3px)`, width: `calc(${w}% - 6px)` } as React.CSSProperties };
    });
  };
  const hourLabels: string[] = [];
  for (let h = 7; h < 19; h++) hourLabels.push((h % 12 || 12) + (h < 12 ? " am" : " pm"));

  const shiftSel = (dir: 1 | -1) => {
    if (mode === "week") setSel(oAdd(sel, 7 * dir));
    else if (mode === "day") setSel(oAdd(sel, dir));
    else {
      const p = oP(sel);
      setSel(oS(new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth() + dir, 1))));
    }
  };

  const calTitle = oF(mode === "week" ? week[3] : sel, { month: "long", year: "numeric" });
  const tabCal = view === "cal";
  const tabCust = view === "customers" || view === "customer";

  /* ---------- Visit actions ---------- */
  const confirmDone = () => {
    if (!sv0 || !svC) return;
    const paid = ((tmp.paid as Paid) || "Not yet") as Paid;
    const note = tStr("doneNote").trim();
    mutate(svC.id, (c) => hist("Clean done" + (paid !== "Not yet" ? " · paid by " + paid : " · not paid yet"), sv0.date)(setVisit(c, sv0.id, { status: "done", paid, note })));
    const st2 = planStats(setVisit(svC, sv0.id, { status: "done" }), today);
    setVMode("detail");
    const first = svC.first;
    const id = svC.id;
    showToast({ text: "Done · " + st2.done + " of " + st2.total + " for " + first, actLabel: "View " + first, act: () => { openCust(id); setToastState(null); } });
  };
  const confirmResched = () => {
    if (!sv0 || !svC || !tStr("rDate")) return;
    const d = tStr("rDate");
    mutate(svC.id, (c) => hist("Visit moved from " + oMD(sv0.date) + " to " + oMD(d))(setVisit(c, sv0.id, { date: d, win: rWinCur, t: tStr("rT", "13:00"), status: "rescheduled" })));
    setSel(d);
    setVMode("detail");
    showToast(tmp.rText ? { text: "Moved to " + oShort(d), href: sms(svC.phone, rMsg), hrefLabel: "Send text" } : { text: "Moved to " + oShort(d) });
  };
  const confirmSkip = () => {
    if (!sv0 || !svC) return;
    const reason = tStr("sReason").trim();
    mutate(svC.id, (c) => {
      let n = setVisit(c, sv0.id, { status: "skipped", note: reason });
      if (sPush) n = pushVisit(n);
      return hist("Skipped " + oMD(sv0.date) + (sPush ? " · plan pushed by one visit" : "") + (reason ? " · " + reason : ""))(n);
    });
    setVMode("detail");
    showToast(tmp.sText ? { text: "Visit skipped", href: sms(svC.phone, sMsg), hrefLabel: "Send text" } : { text: "Visit skipped" });
  };
  const confirmCancel = () => {
    if (!sv0 || !svC) return;
    mutate(svC.id, (c) => hist("Visit on " + oMD(sv0.date) + " cancelled")(setVisit(c, sv0.id, { status: "cancelled" })));
    setVMode("detail");
    showToast({ text: "Visit cancelled" });
  };
  const undoVisit = () => {
    if (!sv0 || !svC) return;
    const wasDone = sv0.status === "done";
    mutate(svC.id, (c) => hist(wasDone ? "Undid done for " + oMD(sv0.date) : "Visit on " + oMD(sv0.date) + " put back on the schedule")(setVisit(c, sv0.id, { status: "scheduled", paid: "", note: wasDone ? "" : sv0.note })));
  };
  const confirmBook = async () => {
    if (!bSel || !svC?.pending || busy) return;
    setBusy(true);
    const res = await bookPendingAction(svC.pending.link, bSel.id).catch(() => ({ ok: false as const, error: "Could not mark it as booked. Try again." }));
    setBusy(false);
    if (!res.ok) return showToast({ text: res.error });
    setCusts(res.customers);
    const linked = res.customers.find((c) => c.linkIds.includes(svC.pending!.link) && !c.virtual);
    setSheet(null);
    if (linked) openCust(linked.id);
    showToast({ text: svC.first + " is booked: " + bSel.name });
  };
  const confirmAddVisit = () => {
    const c = custById(tStr("aCid"));
    const aWin = (tStr("aWin") || "afternoon") as OWin;
    if (!c || !tStr("aDate") || !Number(cleanPrice(tStr("aPrice")))) return setT({ aErr: "Choose a customer, a date and a price." });
    const v: Visit = { id: newId(), date: tStr("aDate"), win: aWin, t: tStr("aT", "13:00"), status: "scheduled", price: cleanPrice(tStr("aPrice")), paid: "", note: "", priv: "", oneOff: true };
    mutate(c.id, (x) => hist("One-off visit added for " + oMD(v.date))({ ...x, visits: x.visits.concat([v]) }));
    setSheet(null);
    setView("cal");
    setSel(v.date);
    flashVisit(v.id);
    showToast({ text: "Visit added for " + oShort(v.date) });
  };
  const togglePause = () => {
    if (!cuC) return;
    const pausing = !cuC.paused;
    mutate(cuC.id, (c) =>
      hist(pausing ? "Plan paused" : "Plan resumed")({
        ...c,
        paused: pausing || undefined,
        visits: c.visits.map((v) =>
          v.date >= today && (pausing ? v.status === "scheduled" || v.status === "rescheduled" : v.status === "paused") ? { ...v, status: pausing ? "paused" : "scheduled" } : v,
        ),
      }),
    );
    showToast({ text: pausing ? "Plan paused. Visits are off the calendar." : "Plan resumed" });
  };

  /* ---------- Sheet bodies ---------- */
  const renderVisitSheet = () => {
    if (!sv0 || !svC) return null;
    const p = svC.plan;
    const st = statMap[svC.id];
    const n = visitN(sv0);
    const hol = holiday(sv0.date);
    const tent = !!sv0.tentative;
    const canAct = !tent && (sv0.status === "scheduled" || sv0.status === "rescheduled");
    const canUndo = sv0.status === "done" || sv0.status === "skipped" || sv0.status === "cancelled";
    const planLine = sv0.oneOff
      ? "One-off visit · $" + sv0.price
      : !p
        ? ""
        : p.type === "once"
          ? "One-time clean · $" + sv0.price
          : O_FREQ[p.freq] + " · " + (p.term === "none" ? "no end date" : p.term + "-month plan") + (n ? " · visit " + n + (p.term === "none" ? "" : " of " + st.total) : "") + " · $" + sv0.price + " per clean";
    const doneLine = sv0.status === "done" ? "Done" + (sv0.paid ? " · " + (sv0.paid === "Not yet" ? "not paid yet" : "paid by " + sv0.paid) : "") + (sv0.note ? " · " + sv0.note : "") : "";
    const extras = svC.extras.map(extraName);
    const remind = sms(svC.phone, "Hi " + svC.first + "! Just checking you saw your Crystal Clean booking link for " + oShort(sv0.date) + ". Tap it to pick your option and confirm: " + (svC.pending ? bookUrl(svC.pending.link) : ""));
    return (
      <>
        <div className="sh-b">
          {svC.important && (
            <div className="impbox">
              <Leaf size={24} />
              <div>
                <div className="k">Important</div>
                <div className="v">{svC.important}</div>
              </div>
            </div>
          )}
          <div>
            <div className="when">{oF(sv0.date, { weekday: "long", month: "long", day: "numeric" })}</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{sv0.win === "custom" ? "Arrives at " + oTime(sv0.win, sv0.t) : "Arrival window " + oTime(sv0.win, sv0.t)}</div>
          </div>
          <div className="row">
            <span className={"tag s-" + sv0.status}>{V_TAG[sv0.status]}</span>
            {hol && (
              <span className="hol">
                <i aria-hidden="true" />
                {hol} · Holiday, reschedule?
              </span>
            )}
          </div>
          {vmode === "detail" && isRenew(sv0) && (
            <div className="renew">
              <span>
                <b>Last clean of the plan</b>
              </span>
              <button type="button" className="btn btn-sm" onClick={openRenew}>
                Renew plan
              </button>
            </div>
          )}

          {vmode === "detail" && (
            <>
              <div>
                <button type="button" className="linkbtn" style={{ fontSize: 20, padding: 0, minHeight: 36 }} onClick={() => { setCid(svC.id); setView("customer"); if (mobile) setSheet(null); }}>
                  {fullName(svC)}
                </button>
                <div className="vaddr">{svC.addr}</div>
                {svC.addrNotes && <div className="vaddr">{svC.addrNotes}</div>}
              </div>
              <div className="row">
                <a className="opill" href={maps(svC.addr)} target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0E1F3D" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
                  </svg>
                  Directions
                </a>
                {svC.phone && (
                  <>
                    <a className="npill" href={tel(svC.phone)}>
                      Call
                    </a>
                    <a className="npill" href={sms(svC.phone)}>
                      Text
                    </a>
                    <a className="npill" href={wa(svC.phone)} target="_blank" rel="noopener">
                      WhatsApp
                    </a>
                  </>
                )}
              </div>
              {tent && svC.pending && (
                <div className="box">
                  <b>Options offered</b>
                  <div style={{ marginTop: 4 }}>
                    <KV rows={svC.pending.options.map((o, i) => ({ k: "Option " + (i + 1), v: optLine(o) }))} />
                  </div>
                  <div className="quiet">{svC.pending.sent}</div>
                </div>
              )}
              {!tent && planLine && (
                <div className="box" style={{ fontWeight: 700 }}>
                  {planLine}
                </div>
              )}
              {doneLine && (
                <div className="box" style={{ background: "#E3F1E7", color: "#1E6B45", fontWeight: 700 }}>
                  {doneLine}
                </div>
              )}
              <ul className="kv">
                <li>
                  <span className="k">Home</span>
                  <span className="v">
                    {(svC.type === "rental" ? "Vacation rental" : "Home") + " · " + (svC.beds === 0 ? "Studio" : svC.beds + " bed") + " · " + bathsL(svC.baths) + " bath"}
                  </span>
                </li>
                <li>
                  <span className="k">Size</span>
                  <span className="v">{svC.size || "Not set"}</span>
                </li>
                <li>
                  <span className="k">Pets</span>
                  <span className="v">{svC.pets || "None noted"}</span>
                </li>
                {extras.length > 0 && (
                  <li>
                    <span className="k">Extras</span>
                    <span className="row" style={{ justifyContent: "flex-end" }}>
                      {extras.map((x) => (
                        <span key={x} className="xchip">
                          {x}
                        </span>
                      ))}
                    </span>
                  </li>
                )}
              </ul>
              {!tent && (
                <label>
                  <span className="lbl">Private notes for this visit</span>
                  <textarea
                    className="input"
                    placeholder="Gate code, dog in backyard…"
                    value={sv0.priv}
                    onChange={(e) => {
                      const val = e.target.value;
                      mutate(svC.id, (c) => setVisit(c, sv0.id, { priv: val }), 800);
                    }}
                  />
                </label>
              )}
              {canAct && (
                <div className="row">
                  <button type="button" className="opill" onClick={() => setVMode("resched", { rDate: sv0.date, rWin: sv0.win, rT: sv0.t || "13:00", rText: true })}>
                    Reschedule
                  </button>
                  <button type="button" className="opill" onClick={() => setVMode("skip", { sPush: true, sReason: "", sText: false })}>
                    Skip
                  </button>
                  <button type="button" className="linkbtn" style={{ color: "#9A2A14" }} onClick={() => setVMode("cancel")}>
                    Cancel visit
                  </button>
                </div>
              )}
              {tent && svC.pending && (
                <div className="row">
                  <Link className="opill" href={`/admin/links/${svC.pending.link}`}>
                    Open booking link
                  </Link>
                  <button
                    type="button"
                    className="opill"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(bookUrl(svC.pending!.link));
                      } catch {
                        window.prompt("Copy this link", bookUrl(svC.pending!.link));
                      }
                      setCopied(true);
                    }}
                  >
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                  {svC.phone && (
                    <a className="opill" href={remind}>
                      Text a reminder
                    </a>
                  )}
                </div>
              )}
            </>
          )}

          {vmode === "done" && (
            <>
              <p style={{ margin: 0, fontWeight: 700 }}>
                {fullName(svC)}
                {planLine ? " · " + planLine : ""}
              </p>
              <div>
                <span className="lbl" id="pd">
                  Paid
                </span>
                <div className="chips" role="group" aria-labelledby="pd">
                  {(["Cash", "Zelle", "Card", "Not yet"] as Paid[]).map((pp) => (
                    <button key={pp} type="button" className={tmp.paid === pp ? "chip sel" : "chip"} aria-pressed={tmp.paid === pp} onClick={() => setT({ paid: pp })}>
                      {pp}
                    </button>
                  ))}
                </div>
              </div>
              <label>
                <span className="lbl">
                  Note <span className="opt-lbl">(optional)</span>
                </span>
                <textarea className="input" placeholder="Anything to remember for next time" value={tStr("doneNote")} onChange={onTmp("doneNote")} />
              </label>
            </>
          )}

          {vmode === "resched" && (
            <>
              <label>
                <span className="lbl">New date</span>
                <input className="input" type="date" value={tStr("rDate")} onChange={onTmp("rDate")} />
              </label>
              <div>
                <span className="lbl">Arrival</span>
                <Chips list={winChips(rWinCur, (w) => setT({ rWin: w }))} label="Arrival window" />
              </div>
              {rWinCur === "custom" && (
                <label>
                  <span className="lbl">Arrival time</span>
                  <input className="input" type="time" value={tStr("rT", "13:00")} onChange={onTmp("rT")} style={{ maxWidth: 220 }} />
                </label>
              )}
              {svC.phone && (
                <label className="switch">
                  <span>Text {svC.first} the new time</span>
                  <input type="checkbox" checked={!!tmp.rText} onChange={(e) => setT({ rText: e.target.checked })} />
                </label>
              )}
              {!!tmp.rText && svC.phone && <div className="msg">{rMsg}</div>}
              <p className="quiet" style={{ margin: 0 }}>
                Only this visit moves. The rest of the plan stays the same.
              </p>
            </>
          )}

          {vmode === "skip" && (
            <>
              <Radios
                label="How to skip"
                list={[
                  { t: "Push the plan by one visit", d: "Keeps the same number of cleans. One more is added at the end.", on: sPush, pick: () => setT({ sPush: true }) },
                  { t: "Just skip", d: "The plan has one less clean.", on: !sPush, pick: () => setT({ sPush: false }) },
                ]}
              />
              <label>
                <span className="lbl">
                  Reason <span className="opt-lbl">(optional)</span>
                </span>
                <input className="input" placeholder="e.g. Out of town" value={tStr("sReason")} onChange={onTmp("sReason")} />
              </label>
              {svC.phone && (
                <label className="switch">
                  <span>Text {svC.first} about it</span>
                  <input type="checkbox" checked={!!tmp.sText} onChange={(e) => setT({ sText: e.target.checked })} />
                </label>
              )}
              {!!tmp.sText && svC.phone && <div className="msg">{sMsg}</div>}
            </>
          )}

          {vmode === "cancel" && (
            <div className="box">
              Cancel {svC.first}&apos;s clean on {oF(sv0.date, { weekday: "long", month: "long", day: "numeric" })}? It won&apos;t be rescheduled. To end the whole plan, use Cancel plan on the customer page.
            </div>
          )}

          {vmode === "book" && (
            <>
              <p style={{ margin: 0 }}>Which option did {svC.first} pick?</p>
              <Radios label="Option picked" list={bOpts.map((o) => ({ t: o.name, d: perClean(o), on: tmp.bOpt === o.id, pick: () => setT({ bOpt: o.id }) }))} />
              {bookPreview && (
                <div className="preview">
                  <CalIcon />
                  <span>{bookPreview}</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className="sh-f">
          {vmode === "detail" && canAct && (
            <button type="button" className="btn btn-block" onClick={() => setVMode("done", { paid: tmp.paid || "", doneNote: "" })}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0E1F3D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12 5 5 9-10" />
              </svg>
              Mark as done
            </button>
          )}
          {vmode === "detail" && tent && (
            <button type="button" className="btn btn-block" onClick={() => setVMode("book", { bOpt: "" })}>
              Mark as booked
            </button>
          )}
          {vmode === "detail" && canUndo && (
            <button type="button" className="btn btn-out btn-block" onClick={undoVisit}>
              {sv0.status === "done" ? "Undo done" : "Put back on the schedule"}
            </button>
          )}
          {vmode === "done" && (
            <button type="button" className="btn btn-block" onClick={confirmDone}>
              Mark as done
            </button>
          )}
          {vmode === "resched" && (
            <button type="button" className="btn btn-block" onClick={confirmResched} disabled={!tStr("rDate")}>
              {tmp.rText && svC.phone ? "Save and text " + svC.first : "Save new time"}
            </button>
          )}
          {vmode === "skip" && (
            <button type="button" className="btn btn-block" onClick={confirmSkip}>
              Skip this visit
            </button>
          )}
          {vmode === "cancel" && (
            <>
              <button type="button" className="btn btn-red btn-block" onClick={confirmCancel}>
                Yes, cancel this visit
              </button>
              <button type="button" className="linkbtn" style={{ alignSelf: "center" }} onClick={() => setVMode("detail")}>
                Keep visit
              </button>
            </>
          )}
          {vmode === "book" && (
            <button type="button" className="btn btn-block" disabled={!bSel || busy} onClick={confirmBook}>
              {busy ? "Saving…" : "Mark as booked"}
            </button>
          )}
        </div>
      </>
    );
  };

  const renderRenew = () => {
    if (!rc?.plan || !rst) return null;
    const p = rc.plan;
    const f = (tStr("nFreq") || p.freq) as OFreq;
    const term = (tStr("nTerm") || "3") as Term;
    const price = tStr("nPrice", p.price);
    const lastD = rst.end || today;
    const firstNew = nextOf(f, lastD);
    const dates = planDates("plan", f, term, firstNew, term === "none" ? 6 : undefined);
    const msg =
      "Hi " + rc.first + "! Your " + (p.term === "none" ? "" : p.term + "-month ") + "plan with Crystal Clean ends with your clean on " + (rst.end ? oShort(rst.end) : "—") + ". Want to keep going? " + O_FREQ[f] + ", $" + price + " per clean, starting " + oShort(firstNew) + ". Reply YES and we’ll keep your spot.";
    const apply = () => {
      const plan: Plan = { ...p, freq: f, term, price: cleanPrice(price) || p.price, first: undefined };
      const nv = genVisits(plan, firstNew, oCount("plan", f, term));
      mutate(rc.id, (c) => hist("Renewed: " + O_FREQ[f] + " · " + (term === "none" ? "no end date" : term + "-month plan") + " · $" + plan.price + " per clean")({ ...c, plan, visits: c.visits.concat(nv) }));
      setSheet(null);
      showToast({ text: rc.first + "'s plan is renewed" });
    };
    return (
      <>
        <div className="sh-b">
          <p style={{ margin: 0 }}>Same frequency and price as now. Change anything before you send it.</p>
          <div>
            <span className="lbl">Frequency</span>
            <Chips list={freqChips(f, (x) => setT({ nFreq: x }))} label="Frequency" />
          </div>
          <div>
            <span className="lbl">Term</span>
            <Chips list={termChips(term, (x) => setT({ nTerm: x }))} label="Term" />
          </div>
          <label>
            <span className="lbl">Price per clean</span>
            <input className="input" inputMode="decimal" value={price} onChange={onTmp("nPrice")} style={{ maxWidth: 220 }} />
          </label>
          <div className="preview">
            <CalIcon />
            <span>{term === "none" ? "Ongoing from " + oMD(firstNew) + " · $" + price + " per clean" : listPreview(dates, price)}</span>
          </div>
          {rc.phone && (
            <div>
              <span className="lbl">Message preview</span>
              <div className="msg">{msg}</div>
            </div>
          )}
        </div>
        <div className="sh-f">
          {rc.phone && (
            <a className="btn btn-block" href={sms(rc.phone, msg)} onClick={() => mutate(rc.id, hist("Renewal offer texted"))}>
              Text renewal offer
            </a>
          )}
          <Link className="btn btn-out btn-block" href={`/admin/links/new?customer=${rc.id}`}>
            Create booking link
          </Link>
          <button type="button" className="linkbtn" style={{ alignSelf: "center" }} onClick={apply}>
            They said yes: add the new visits now
          </button>
        </div>
      </>
    );
  };

  const renderChange = () => {
    if (!rc?.plan || !rst) return null;
    const p = rc.plan;
    const f = (tStr("cFreq") || p.freq) as OFreq;
    const w = (tStr("cWin") || p.win) as OWin;
    const from = tStr("cFrom") || (rst.next && !rst.next.pending ? rst.next.date : today);
    const price = tStr("cPrice", p.price);
    const future = rc.visits.filter((v) => !v.oneOff && (v.status === "scheduled" || v.status === "rescheduled" || v.status === "paused") && v.date >= from).sort(byDate);
    const dates = future.map((_, k) => oStep(f, from, k));
    const apply = () => {
      const plan: Plan = { ...p, freq: f, win: w, t: tStr("cT", p.t), price: cleanPrice(price) || p.price };
      const ids = new Set(future.map((v) => v.id));
      const nv: Visit[] = dates.map((d, k) => ({ id: newId(), date: d, win: plan.win, t: plan.t, status: future[k].status === "paused" ? "paused" : "scheduled", price: plan.price, paid: "", note: "", priv: future[k].priv }));
      mutate(rc.id, (c) => hist("Plan changed from " + oMD(from) + ": " + O_FREQ[f] + " · $" + plan.price + " per clean · " + oTime(plan.win, plan.t))({ ...c, plan, visits: c.visits.filter((v) => !ids.has(v.id)).concat(nv) }));
      setSheet(null);
      showToast({ text: "Plan updated from " + oMD(from) });
    };
    return (
      <>
        <div className="sh-b">
          <div>
            <span className="lbl">Frequency</span>
            <Chips list={freqChips(f, (x) => setT({ cFreq: x }))} label="Frequency" />
          </div>
          <label>
            <span className="lbl">Price per clean</span>
            <input className="input" inputMode="decimal" value={price} onChange={onTmp("cPrice")} style={{ maxWidth: 220 }} />
          </label>
          <div>
            <span className="lbl">Arrival</span>
            <Chips list={winChips(w, (x) => setT({ cWin: x }))} label="Arrival window" />
          </div>
          {w === "custom" && (
            <label>
              <span className="lbl">Arrival time</span>
              <input className="input" type="time" value={tStr("cT", p.t)} onChange={onTmp("cT")} style={{ maxWidth: 220 }} />
            </label>
          )}
          <label>
            <span className="lbl">Starting from</span>
            <input className="input" type="date" value={from} onChange={onTmp("cFrom")} />
          </label>
          <div className="preview">
            <span>
              {future.length
                ? "The remaining " + future.length + (future.length === 1 ? " clean moves to: " : " cleans move to: ") + listPreview(dates, price).replace(/^\d+ cleans?: /, "")
                : "No upcoming cleans after this date."}
            </span>
          </div>
        </div>
        <div className="sh-f">
          <button type="button" className="btn btn-block" onClick={apply}>
            Save plan changes
          </button>
        </div>
      </>
    );
  };

  const renderCancelPlan = () => {
    if (!rc) return null;
    const fut = rc.visits.filter((v) => v.status === "scheduled" || v.status === "rescheduled" || v.status === "paused");
    const apply = () => {
      const ids = new Set(fut.map((v) => v.id));
      mutate(rc.id, (c) => hist("Plan cancelled")({ ...c, cancelled: true, paused: undefined, visits: c.visits.map((v) => (ids.has(v.id) ? { ...v, status: "cancelled" } : v)) }));
      setSheet(null);
      showToast({ text: rc.first + "'s plan is cancelled" });
    };
    return (
      <>
        <div className="sh-b">
          <div className="box">
            Cancel {rc.first}&apos;s plan? {fut.length + (fut.length === 1 ? " upcoming visit" : " upcoming visits")} will be cancelled.
          </div>
          <label className="switch">
            <span>Keep visits already done</span>
            <input type="checkbox" checked disabled readOnly />
          </label>
          <p className="quiet" style={{ margin: 0 }}>
            Done visits always stay in their history.
          </p>
        </div>
        <div className="sh-f">
          <button type="button" className="btn btn-red btn-block" onClick={apply}>
            Yes, cancel the plan
          </button>
          <button type="button" className="linkbtn" style={{ alignSelf: "center" }} onClick={() => setSheet(null)}>
            Keep plan
          </button>
        </div>
      </>
    );
  };

  const renderAddVisit = () => {
    const aWin = (tStr("aWin") || "afternoon") as OWin;
    const opts = custs.filter((c) => !c.virtual && !c.cancelled);
    return (
      <>
        <div className="sh-b">
          <label>
            <span className="lbl">Customer</span>
            <select
              className="input"
              value={tStr("aCid")}
              onChange={(e) => {
                const c = custById(e.target.value);
                setT({ aCid: e.target.value, aPrice: tStr("aPrice") || c?.plan?.price || "", aErr: "" });
              }}
            >
              <option value="">Choose a customer</option>
              {opts.map((o) => (
                <option key={o.id} value={o.id}>
                  {fullName(o)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="lbl">Date</span>
            <input className="input" type="date" value={tStr("aDate")} onChange={onTmp("aDate")} />
          </label>
          <div>
            <span className="lbl">Arrival</span>
            <Chips list={winChips(aWin, (w) => setT({ aWin: w }))} label="Arrival window" />
          </div>
          {aWin === "custom" && (
            <label>
              <span className="lbl">Arrival time</span>
              <input className="input" type="time" value={tStr("aT", "13:00")} onChange={onTmp("aT")} style={{ maxWidth: 220 }} />
            </label>
          )}
          <label>
            <span className="lbl">Price</span>
            <input className="input" inputMode="decimal" value={tStr("aPrice")} onChange={onTmp("aPrice")} />
          </label>
          <p className="quiet" style={{ margin: 0 }}>
            A one-off visit doesn&apos;t change their plan. To add someone new, use Add customer.
          </p>
          {tStr("aErr") && (
            <div className="err" role="alert">
              {tStr("aErr")}
            </div>
          )}
        </div>
        <div className="sh-f">
          <button type="button" className="btn btn-block" onClick={confirmAddVisit}>
            Add visit
          </button>
        </div>
      </>
    );
  };

  const shTitles: Record<VMode, string> = { detail: "Visit", done: "Mark as done", resched: "Reschedule", skip: "Skip this visit", cancel: "Cancel visit", book: "Mark as booked" };
  const shTitle = sv0
    ? shTitles[vmode as VMode]
    : sheet?.kind === "fab"
      ? "Add"
      : sheet?.kind === "addVisit"
        ? "Add visit"
        : sheet?.kind === "renew"
          ? rc
            ? "Renew " + rc.first + "'s plan"
            : ""
          : sheet?.kind === "change"
            ? "Change plan"
            : sheet?.kind === "cancelPlan"
              ? "Cancel plan"
              : "";
  // A visit sheet whose visit disappeared (e.g. plan changed) just closes.
  const sheetOn = !!sheet && !(sheet.kind === "visit" && !sv0);

  /* ---------- Customer cards ---------- */
  const CustCard = ({ c }: { c: OpsCustomer }) => {
    const st = statMap[c.id];
    const pend = st.status === "Pending pick" && !!c.pending;
    const p = c.plan;
    const planSum = pend
      ? c.pending!.options.map(optLong).join(" or ")
      : !p
        ? "No plan"
        : p.type === "once"
          ? "One-time · $" + p.price
          : O_FREQ[p.freq] + " · $" + p.price + firstTag(p) + " · " + (p.term === "none" ? "no end date" : p.term + "-month");
    const hasPb = !pend && !!p && p.term !== "none";
    const progress = pend ? c.pending!.sent : !p ? "" : p.term === "none" && p.type !== "once" ? st.done + " done · ongoing" : st.done + " of " + st.total + " done";
    const next = st.next ? (st.next.pending ? "Reserved: " : "Next: ") + oShort(st.next.date) + ", " + oTime(st.next.win, st.next.t) : st.status === "Ended" && st.end ? "Last: " + oShort(st.end) : "No visits scheduled";
    return (
      <button type="button" className={pend ? "cc pend" : "cc"} onClick={() => openCust(c.id)}>
        <span className="vtop">
          <span className="cname">{fullName(c)}</span>
          <span className={TAG_CLS[st.status]}>{st.status}</span>
        </span>
        <span className="vaddr">
          {oTown(c.addr)} · {planSum}
        </span>
        {hasPb && (
          <span className="pb" aria-hidden="true">
            <i style={{ width: (st.total ? Math.round((st.done / st.total) * 100) : 0) + "%" }} />
          </span>
        )}
        <span className="vtop">
          <span style={{ fontSize: 14, fontWeight: 700 }}>{progress}</span>
          <span className="vaddr">{next}</span>
        </span>
      </button>
    );
  };

  const renderCustomer = () => {
    if (!cuC) return null;
    const st = statMap[cuC.id];
    const p = cuC.plan;
    const pend = cuC.pending;
    const all = cuC.visits.slice().sort(byDate);
    const upcoming = all.filter((v) => v.date >= today && v.status !== "done");
    const past = all.filter((v) => v.date < today || v.status === "done").reverse();
    const extras = cuC.extras.map(extraName);
    const VRow = ({ v }: { v: Visit }) => (
      <button type="button" className="vrow" onClick={openVisit({ ...v, cid: cuC.id })}>
        <span className="d">
          <b>{oShort(v.date)}</b>
          <span>
            {oTime(v.win, v.t)}
            {Number(v.price) ? " · $" + v.price : ""}
            {v.oneOff ? " · one-off" : ""}
          </span>
        </span>
        {holiday(v.date) && (
          <span className="hol">
            <i aria-hidden="true" />
            Holiday
          </span>
        )}
        <span className={"tag s-" + v.status}>{V_TAG[v.status]}</span>
      </button>
    );
    const tentV = allVisits.find((v) => v.cid === cuC.id && v.tentative);
    return (
      <div className="cd">
        <div className="full">
          <button type="button" className="linkbtn" onClick={goView("customers")}>
            <Chev dir="l" />
            Customers
          </button>
        </div>
        <section className="card sec full">
          <div className="vtop" style={{ alignItems: "flex-start" }}>
            <div>
              <h1 className="h1">{fullName(cuC)}</h1>
              <div className="vaddr" style={{ marginTop: 2 }}>
                {oShortAddr(cuC.addr)}
              </div>
            </div>
            <span className={TAG_CLS[st.status]}>{st.status}</span>
          </div>
          <div className="row">
            {cuC.phone && (
              <>
                <a className="npill" href={tel(cuC.phone)}>
                  Call
                </a>
                <a className="npill" href={sms(cuC.phone)}>
                  Text
                </a>
                <a className="npill" href={wa(cuC.phone)} target="_blank" rel="noopener">
                  WhatsApp
                </a>
              </>
            )}
            <button type="button" className="opill" onClick={editCust} style={{ marginLeft: "auto" }}>
              Edit
            </button>
          </div>
        </section>
        {cuC.important && (
          <div className="impbox full">
            <Leaf size={24} />
            <label style={{ flex: 1 }}>
              <span className="k" style={{ display: "block" }}>
                Important
              </span>
              <input
                key={cuC.id}
                className="input"
                style={{ minHeight: 44, fontWeight: 700, background: "transparent", borderColor: "#C9A25E" }}
                defaultValue={cuC.important}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== cuC.important) mutate(cuC.id, (c) => ({ ...c, important: val }));
                }}
                aria-label="Important note"
              />
            </label>
          </div>
        )}
        {st.status === "Ending soon" && (
          <div className="renew full">
            <span>
              <b>Plan ending soon</b>
              <br />
              <span className="vaddr" style={{ color: "#0E1F3D" }}>
                {st.left + (st.left === 1 ? " clean left" : " cleans left") + " · last on " + (st.end ? oShort(st.end) : "")}
              </span>
            </span>
            <button type="button" className="btn btn-sm" onClick={openRenew}>
              Renew plan
            </button>
          </div>
        )}
        <div className="cdcol">
          {pend && (
            <section className="card sec">
              <h2 className="h2">Waiting for {cuC.first} to pick</h2>
              <p className="vaddr" style={{ margin: 0 }}>
                {pend.sent}
              </p>
              <KV
                rows={[{ k: "Reserved", v: oShort(pend.date) + " · " + oTime(pend.win, pend.t) }, ...pend.options.map((o, i) => ({ k: "Option " + (i + 1), v: optLine(o) }))]}
              />
              <div className="row">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    if (!tentV) return;
                    setSheet({ kind: "visit", vid: tentV.id, mode: "book" });
                    setTmp({});
                  }}
                >
                  Mark as booked
                </button>
                <Link className="opill" href={`/admin/links/${pend.link}`}>
                  Open booking link
                </Link>
              </div>
            </section>
          )}
          {p && (
            <section className="card sec">
              <div className="vtop">
                <h2 className="h2">Plan</h2>
                <span className="ptag">{p.type === "once" ? "One-time" : O_FREQ[p.freq]}</span>
              </div>
              <div>
                <div className="vtop" style={{ marginBottom: 6 }}>
                  <b>{p.term === "none" && p.type !== "once" ? st.done + " done · ongoing" : st.done + " of " + st.total + " done · " + st.left + " left"}</b>
                  <span className="quiet">{oMoney(sumPrice(st.cnt.filter((v) => v.status === "done"))) + " of ~" + oMoney(sumPrice(st.cnt))}</span>
                </div>
                <div className="pb" role="progressbar" aria-label="Cleans done" aria-valuemin={0} aria-valuemax={st.total} aria-valuenow={st.done}>
                  <i style={{ width: (st.total ? Math.round((st.done / st.total) * 100) : 0) + "%" }} />
                </div>
              </div>
              <KV
                rows={[
                  { k: "Plan", v: planName(p) },
                  { k: "Price", v: perClean(p) },
                  { k: "Start date", v: p.start ? oShort(p.start) : "—" },
                  { k: "Arrival", v: oTime(p.win, p.t) + (p.type === "plan" && p.freq === "monthly" && p.start ? " · " + oOrd(Math.ceil(oP(p.start).getUTCDate() / 7)) + " " + oF(p.start, { weekday: "long" }) : "") },
                  { k: "Term", v: p.type === "once" ? "One visit" : p.term === "none" ? "No end date" : p.term + (p.term === "1" ? " month" : " months") },
                  { k: "Ends", v: p.term === "none" && p.type !== "once" ? "Ongoing" : st.end ? oShort(st.end) : "—" },
                  { k: "Renewal due by", v: p.type === "once" || p.term === "none" ? "—" : st.renewal ? oShort(st.renewal) : "—" },
                ]}
              />
              {!cuC.cancelled && (
                <div className="row">
                  {p.type === "plan" && (
                    <>
                      <button type="button" className="opill" onClick={() => { setSheet({ kind: "change", cid: cuC.id }); setTmp({ cPrice: p.price, cT: p.t }); }}>
                        Change plan
                      </button>
                      <button type="button" className="opill" onClick={togglePause}>
                        {cuC.paused ? "Resume plan" : "Pause plan"}
                      </button>
                    </>
                  )}
                  {p.type !== "once" && p.term !== "none" && (
                    <button type="button" className="opill" onClick={openRenew}>
                      Renew
                    </button>
                  )}
                  <button type="button" className="linkbtn" style={{ color: "#9A2A14" }} onClick={() => { setSheet({ kind: "cancelPlan", cid: cuC.id }); setTmp({}); }}>
                    {p.type === "once" ? "Cancel clean" : "Cancel plan"}
                  </button>
                </div>
              )}
            </section>
          )}
          <section className="card sec">
            <div className="vtop">
              <h2 className="h2">Visits</h2>
              {!cuC.virtual && (
                <button type="button" className="linkbtn" onClick={() => { setSheet({ kind: "addVisit" }); setTmp({ aCid: cuC.id, aDate: "", aWin: "afternoon", aT: "13:00", aPrice: p ? p.price : "" }); }}>
                  + Add a one-off visit
                </button>
              )}
            </div>
            {upcoming.length > 0 && (
              <>
                <h3 className="sech" style={{ margin: 0 }}>
                  Upcoming
                </h3>
                <div>
                  {upcoming.map((v) => (
                    <VRow key={v.id} v={v} />
                  ))}
                </div>
              </>
            )}
            {past.length > 0 && (
              <>
                <h3 className="sech" style={{ margin: 0 }}>
                  Past
                </h3>
                <div>
                  {past.map((v) => (
                    <VRow key={v.id} v={v} />
                  ))}
                </div>
              </>
            )}
            {!upcoming.length && !past.length && <p className="vaddr" style={{ margin: 0 }}>{pend ? "Visits appear here once they pick an option." : "No visits yet."}</p>}
          </section>
        </div>
        <div className="cdcol">
          <section className="card sec">
            <h2 className="h2">Home</h2>
            <div className="box" style={{ fontWeight: 700 }}>
              {cuC.addr || "No address yet"}
              {cuC.addrNotes && (
                <div className="vaddr" style={{ fontWeight: 500 }}>
                  {cuC.addrNotes}
                </div>
              )}
            </div>
            {cuC.addr && (
              <div className="row">
                <a className="opill" href={maps(cuC.addr)} target="_blank" rel="noopener">
                  Directions
                </a>
              </div>
            )}
            <KV
              rows={[
                { k: "Type", v: cuC.type === "rental" ? "Vacation rental" : "Home" },
                { k: "Bedrooms", v: cuC.beds === 0 ? "Studio" : String(cuC.beds) },
                { k: "Bathrooms", v: bathsL(cuC.baths) },
                { k: "Size", v: cuC.size || "Not set" },
                { k: "Last professional clean", v: cuC.lastClean || "Not set" },
                { k: "Pets", v: cuC.pets || "None noted" },
                { k: "Quote notes", v: cuC.quoteNotes || "None" },
                {
                  k: "Extras",
                  v: extras.length ? (
                    <span className="row" style={{ justifyContent: "flex-end" }}>
                      {extras.map((x) => (
                        <span key={x} className="xchip">
                          {x}
                        </span>
                      ))}
                    </span>
                  ) : (
                    "None"
                  ),
                },
              ]}
            />
          </section>
          <section className="card sec">
            <h2 className="h2">History</h2>
            <ol className="tl">
              {cuC.history
                .slice()
                .reverse()
                .map((h, i) => (
                  <li key={i}>
                    <div className="d">{oMD(h.d)}</div>
                    <div>{h.t}</div>
                  </li>
                ))}
            </ol>
          </section>
        </div>
      </div>
    );
  };

  const renderForm = () => (
    <div className="cwrap fwrap">
      <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => { setView(fm.editing ? "customer" : "cal"); setForm(null); }}>
        <Chev dir="l" />
        Back
      </button>
      <h1 className="h1">{fm.editing ? "Edit customer" : "Add customer"}</h1>
      {!fm.editing && (
        <section className="card sec">
          <h2 className="h2">Start from</h2>
          <label>
            <span className="sr">Search quote requests</span>
            <input className="input" type="search" placeholder="Search quote requests" value={fq} onChange={(e) => setFq(e.target.value)} />
          </label>
          <div className="menu">
            {sources.map((r) => (
              <button key={r.qid} type="button" className={fm.src === r.qid ? "res sel" : "res"} aria-pressed={fm.src === r.qid} onClick={() => fillFromQuote(r)}>
                <span>
                  <b>{r.cust.name || "No name"}</b>
                  <br />
                  <span className="vaddr">Quote request · {[oTown(r.cust.addr) !== "Orlando" ? oTown(r.cust.addr) : "", r.zip].filter(Boolean).join(" ") || "No ZIP"}</span>
                </span>
                <span className="vaddr">{r.received}</span>
              </button>
            ))}
            {!sources.length && <p className="vaddr" style={{ margin: 0 }}>{quotes.length ? "No other quote requests to pick from." : "No quote requests yet."} Booked links become customers on their own.</p>}
          </div>
          <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => setForm({ ...blankForm(), planType: fm.planType, freq: fm.freq, term: fm.term, price: fm.price, start: fm.start, win: fm.win, t: fm.t })}>
            Enter manually
          </button>
        </section>
      )}
      <section className="card sec">
        <h2 className="h2">Contact and home</h2>
        <div className="fgrid">
          <label className="span2">
            <span className="lbl">Name</span>
            <input className="input" value={fm.name} onChange={fonStr("name")} autoComplete="off" />
          </label>
          <label>
            <span className="lbl">Mobile</span>
            <input className="input" type="tel" value={fm.phone} onChange={fonStr("phone")} autoComplete="off" />
          </label>
          <label>
            <span className="lbl">
              Email <span className="opt-lbl">(optional)</span>
            </span>
            <input className="input" type="email" value={fm.email} onChange={fonStr("email")} autoComplete="off" />
          </label>
          <label className="span2">
            <span className="lbl">Address</span>
            <input className="input" placeholder="Street, town, FL ZIP" value={fm.addr} onChange={fonStr("addr")} autoComplete="off" />
          </label>
          <label className="span2">
            <span className="lbl">
              Apt, gate or parking notes <span className="opt-lbl">(optional)</span>
            </span>
            <input className="input" value={fm.addrNotes} onChange={fonStr("addrNotes")} />
          </label>
          <div className="span2">
            <span className="lbl" id="fht">
              Home type
            </span>
            <Seg
              label="Home type"
              list={(
                [
                  ["home", "Home"],
                  ["rental", "Vacation rental"],
                ] as const
              ).map((t) => ({ label: t[1], on: fm.type === t[0], pick: () => setFm({ type: t[0] }) }))}
            />
          </div>
          <div>
            <span className="lbl" id="fbd">
              Bedrooms
            </span>
            <div className="stepper" role="group" aria-labelledby="fbd">
              <button type="button" aria-label="Fewer bedrooms" onClick={() => setFm({ beds: Math.max(0, fm.beds - 1) })}>
                −
              </button>
              <div className="val" aria-live="polite">
                {fm.beds === 0 ? "Studio" : fm.beds}
              </div>
              <button type="button" aria-label="More bedrooms" onClick={() => setFm({ beds: Math.min(8, fm.beds + 1) })}>
                +
              </button>
            </div>
          </div>
          <div>
            <span className="lbl" id="fba">
              Bathrooms
            </span>
            <div className="stepper" role="group" aria-labelledby="fba">
              <button type="button" aria-label="Fewer bathrooms" onClick={() => setFm({ baths: Math.max(1, fm.baths - 0.5) })}>
                −
              </button>
              <div className="val" aria-live="polite">
                {bathsL(fm.baths)}
              </div>
              <button type="button" aria-label="More bathrooms" onClick={() => setFm({ baths: Math.min(8, fm.baths + 0.5) })}>
                +
              </button>
            </div>
          </div>
          <label>
            <span className="lbl">Size</span>
            <select className="input" value={fm.size} onChange={fonStr("size")}>
              {(SIZES.includes(fm.size) || !fm.size ? SIZES : [fm.size, ...SIZES]).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="lbl">
              Pets <span className="opt-lbl">(optional)</span>
            </span>
            <input className="input" placeholder="e.g. Dog in backyard" value={fm.pets} onChange={fonStr("pets")} />
          </label>
          <div className="span2">
            <span className="lbl" id="fex">
              Extras
            </span>
            <Chips
              label="Extras"
              list={O_EXTRAS.map((x) => {
                const on = fm.extras.includes(x[0]);
                return { label: x[1], on, pick: () => setFm({ extras: on ? fm.extras.filter((k) => k !== x[0]) : fm.extras.concat([x[0]]) }) };
              })}
            />
          </div>
          <label className="span2">
            <span className="lbl">
              Important note <span className="opt-lbl">(shown on every visit)</span>
            </span>
            <input className="input" placeholder="e.g. Fragrance-free" value={fm.important} onChange={fonStr("important")} />
          </label>
        </div>
      </section>
      {!fm.editing && (
        <section className="card sec">
          <h2 className="h2">Plan</h2>
          <Seg
            label="Plan type"
            list={(
              [
                ["once", "One-time clean"],
                ["plan", "Plan"],
              ] as const
            ).map((t) => ({ label: t[1], on: fm.planType === t[0], pick: () => setFm({ planType: t[0] }) }))}
          />
          {fm.planType !== "once" && (
            <>
              <div>
                <span className="lbl">Frequency</span>
                <Chips list={freqChips(fm.freq, (x) => setFm({ freq: x }))} label="Frequency" />
              </div>
              <div>
                <span className="lbl">Term</span>
                <Chips list={termChips(fm.term, (x) => setFm({ term: x }))} label="Term" />
              </div>
            </>
          )}
          <div className="fgrid">
            <label>
              <span className="lbl">{fm.planType === "once" ? "Price" : "Price per clean"}</span>
              <input className="input" inputMode="decimal" placeholder="$" value={fm.price} onChange={fonStr("price")} />
            </label>
            <label>
              <span className="lbl">First date</span>
              <input className="input" type="date" value={fm.start} onChange={fonStr("start")} />
            </label>
          </div>
          <div>
            <span className="lbl">Arrival</span>
            <Chips list={winChips(fm.win, (x) => setFm({ win: x }))} label="Arrival window" />
          </div>
          {fm.win === "custom" && (
            <label>
              <span className="lbl">Arrival time</span>
              <input className="input" type="time" value={fm.t} onChange={fonStr("t")} style={{ maxWidth: 220 }} />
            </label>
          )}
          <div className="preview">
            <CalIcon />
            <span>{fPreview}</span>
          </div>
        </section>
      )}
      {fErr && (
        <div className="err" role="alert">
          {fErr}
        </div>
      )}
      <button type="button" className="btn btn-block" style={{ minHeight: 60, fontSize: 19 }} onClick={saveForm}>
        Save customer
      </button>
    </div>
  );

  /* ---------- Page ---------- */
  const monthCells = (() => {
    const m0 = oP(mKey + "-01");
    const gStart = oAdd(mKey + "-01", -m0.getUTCDay());
    const dim = new Date(Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth() + 1, 0)).getUTCDate();
    const cells = Math.ceil((m0.getUTCDay() + dim) / 7) * 7;
    const out: { d: string; list: CV[] }[] = [];
    for (let i = 0; i < cells; i++) {
      const d = oAdd(gStart, i);
      out.push({ d, list: dayVisits(d).filter(live) });
    }
    return out;
  })();

  return (
    <div className="oc">
      <div className="ops" ref={rootRef}>
        <header className="top">
          <div className="top-in">
            <span className="logo" role="img" aria-label="Crystal Clean admin">
              <Roofline width={88} height={11} stroke={5.5} />
              <span className="logo-word" aria-hidden="true">
                Crystal Clean
              </span>
            </span>
            <nav className="dtabs" aria-label="Admin sections">
              <button type="button" className={tabCal ? "dt on" : "dt"} aria-current={tabCal ? "page" : undefined} onClick={goView("cal")}>
                Calendar
              </button>
              <button type="button" className={tabCust ? "dt on" : "dt"} aria-current={tabCust ? "page" : undefined} onClick={goView("customers")}>
                Customers
              </button>
              <Link className="dt" href="/admin/links">
                Booking links
              </Link>
              <Link className="dt" href="/admin/submissions">
                Submissions
              </Link>
              <Link className="dt" href="/admin/prices">
                Prices
              </Link>
            </nav>
            <form action={logout} style={{ marginLeft: "auto" }}>
              <button type="submit" className="signout">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="body">
          <main className="main" aria-live="polite" ref={mainRef}>
            {!storageOk && (
              <div className="empty" style={{ margin: "14px 16px 0", borderStyle: "solid", borderColor: "#C9A25E", background: "#FBF3E2", color: "#0E1F3D", padding: 14 }}>
                No database connected, so customers and visits are only kept until the server restarts. Add REDIS_URL in Vercel.
              </div>
            )}
            {view === "cal" && (
              <>
                <div className="ctool">
                  <div>
                    <div className="ctrow">
                      <h1 className="h1">{mode === "month" ? oF(sel, { month: "long", year: "numeric" }) : calTitle}</h1>
                    </div>
                    <div className="quiet" style={{ marginTop: 4 }}>
                      ~{oMoney(sumOf(mVis))} scheduled in {oF(sel, { month: "long" })}
                    </div>
                  </div>
                  <div className="ctrow">
                    <button type="button" className="opill" onClick={() => setSel(today)}>
                      Today
                    </button>
                    <button type="button" className="navb" aria-label={"Previous " + mode} onClick={() => shiftSel(-1)}>
                      <Chev dir="l" />
                    </button>
                    <button type="button" className="navb" aria-label={"Next " + mode} onClick={() => shiftSel(1)}>
                      <Chev dir="r" />
                    </button>
                    <Seg
                      cls="seg vseg"
                      label="Calendar view"
                      style={{ flex: 1, minWidth: 0 }}
                      list={(
                        [
                          ["day", "Day"],
                          ["week", "Week"],
                          ["month", "Month"],
                        ] as const
                      ).map((m) => ({ label: m[1], on: mode === m[0], pick: () => setMode(m[0]) }))}
                    />
                  </div>
                </div>

                {mode === "week" && (
                  <div
                    onTouchStart={(e) => (tx.current = e.touches[0]?.clientX ?? null)}
                    onTouchEnd={(e) => {
                      const t = e.changedTouches[0];
                      if (tx.current == null || !t) return;
                      const dx = t.clientX - tx.current;
                      tx.current = null;
                      if (Math.abs(dx) > 60) setSel(oAdd(sel, dx < 0 ? 7 : -7));
                    }}
                  >
                    <div className="days" role="group" aria-label="Days this week">
                      {week.map((d) => {
                        const list = dayVisits(d).filter(live);
                        return (
                          <button
                            key={d}
                            type="button"
                            className={"dchip" + (d === today ? " today" : "") + (d === sel ? " cur" : "")}
                            aria-pressed={d === sel}
                            aria-label={oF(d, { weekday: "long", month: "long", day: "numeric" }) + (d === today ? ", today" : "") + ", " + list.length + (list.length === 1 ? " visit" : " visits")}
                            onClick={() => setSel(d)}
                          >
                            <span className="dw">{oF(d, { weekday: "short" })}</span>
                            <span className="dn">{Number(d.slice(8))}</span>
                            <span className="dots" aria-hidden="true">
                              {list.slice(0, 4).map((v) => (
                                <i key={v.id} className={v.tentative ? "t" : ""} />
                              ))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="wsum">
                      <span className="tag s-scheduled" style={{ boxShadow: "none", background: "#fff" }}>
                        {wConf.length + (wConf.length === 1 ? " clean" : " cleans") + (wPend ? " · " + wPend + " pending pick" : "") + " this week"}
                      </span>
                      <span className="quiet">~{oMoney(sumOf(wConf))} this week</span>
                    </div>
                    <div className="agenda">
                      <DayList />
                    </div>
                    <div className="grid-w">
                      <div className="gh">
                        <span />
                        {week.map((d) => (
                          <button
                            key={d}
                            type="button"
                            className={"ghd" + (d === today ? " today" : "") + (d === sel ? " cur" : "")}
                            onClick={() => {
                              setSel(d);
                              setMode("day");
                            }}
                            aria-label={oF(d, { weekday: "long", month: "long", day: "numeric" })}
                          >
                            <span className="dw">{oF(d, { weekday: "short" })}</span>
                            <span className="dn">{Number(d.slice(8))}</span>
                          </button>
                        ))}
                      </div>
                      <div className="gb">
                        <div className="ghrs" aria-hidden="true">
                          {hourLabels.map((h) => (
                            <div key={h} className="ghr">
                              {h}
                            </div>
                          ))}
                        </div>
                        {week.map((d) => (
                          <div key={d} className={"gcol" + (d === today ? " today" : "")}>
                            {blocksFor(d).map(({ v, style }) => {
                              const k = vcard(v);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  className={"gblk" + (v.tentative ? " t" : "") + (v.status === "done" ? " done" : "") + (flash === v.id ? " flash" : "")}
                                  style={style}
                                  onClick={openVisit(v)}
                                  aria-label={k.time + ", " + k.name + ", " + k.tag}
                                >
                                  <span className="gt">{k.time}</span>
                                  <span className="gn">{k.name}</span>
                                  <span className="ga">{k.short}</span>
                                  {k.important && (
                                    <span className="imp">
                                      <Leaf size={12} w={2.2} />
                                      {k.important}
                                    </span>
                                  )}
                                  <span className="ga">{k.planTag}</span>
                                  <span className={k.tagCls} style={{ alignSelf: "flex-start" }}>
                                    {k.tag}
                                  </span>
                                  {holiday(v.date) && !v.tentative && (
                                    <span className="hol" style={{ fontSize: 12 }}>
                                      <i aria-hidden="true" />
                                      Holiday
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {mode === "day" && <DayList />}

                {mode === "month" && (
                  <div className="mgrid" role="grid" aria-label={oF(sel, { month: "long", year: "numeric" })}>
                    {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
                      <div key={i} className="mwd" aria-hidden="true">
                        {w}
                      </div>
                    ))}
                    {monthCells.map(({ d, list }) => (
                      <button
                        key={d}
                        type="button"
                        className={"mcell" + (d.slice(0, 7) === mKey ? "" : " out") + (d === today ? " today" : "") + (d === sel ? " cur" : "")}
                        aria-label={oF(d, { weekday: "long", month: "long", day: "numeric" }) + ", " + list.length + (list.length === 1 ? " visit" : " visits")}
                        onClick={() => {
                          setSel(d);
                          setMode("day");
                        }}
                      >
                        <span className="mnum">{Number(d.slice(8))}</span>
                        {list.slice(0, 2).map((v) => (
                          <span key={v.id} className={"mname" + (v.tentative ? " t" : v.status === "done" ? " d" : "")}>
                            {custById(v.cid)?.first}
                          </span>
                        ))}
                        {list.length > 2 && <span className="mmore">+{list.length - 2} more</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {view === "customers" && (
              <div className="cwrap">
                <h1 className="h1">Customers</h1>
                <label className="search">
                  <span className="sr">Search customers</span>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5B6474" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                  <input className="input" type="search" placeholder="Search by name, town or phone" value={q} onChange={(e) => setQ(e.target.value)} />
                </label>
                <Chips
                  cls="fchips"
                  label="Filter customers"
                  list={(
                    [
                      ["all", "All"],
                      ["active", "Active"],
                      ["pending", "Pending pick"],
                      ["ending", "Ending soon"],
                      ["ended", "Ended"],
                    ] as const
                  ).map((f) => ({ label: f[1] + " (" + custs.filter((c) => matches(f[0], statMap[c.id].status)).length + ")", on: filter === f[0], pick: () => setFilter(f[0]) }))}
                />
                <div className="ctrow">
                  <span className="quiet" style={{ fontWeight: 700 }}>
                    Sort
                  </span>
                  <Seg
                    label="Sort customers"
                    style={{ flex: 1, maxWidth: 420 }}
                    list={(
                      [
                        ["next", "Next visit"],
                        ["name", "Name"],
                        ["renewal", "Renewal"],
                      ] as const
                    ).map((m) => ({ label: m[1], on: sort === m[0], pick: () => setSort(m[0]) }))}
                  />
                </div>
                {showEnding && (
                  <>
                    <h2 className="sech">Ending soon · needs a renewal decision</h2>
                    <div className="clist">
                      {ending.map((c) => (
                        <CustCard key={c.id} c={c} />
                      ))}
                    </div>
                    <h2 className="sech">Everyone</h2>
                  </>
                )}
                <div className="clist">
                  {sorted
                    .filter((c) => !(showEnding && statMap[c.id].status === "Ending soon"))
                    .map((c) => (
                      <CustCard key={c.id} c={c} />
                    ))}
                  {!sorted.length && <div className="empty">{custs.length ? "No customers match." : "No customers yet. Booked links show up here on their own, or tap + to add one."}</div>}
                </div>
              </div>
            )}

            {view === "customer" && renderCustomer()}
            {view === "add" && renderForm()}
          </main>

          {sheetOn && (
            <div
              className="sw"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSheet(null);
              }}
            >
              <section className="sh" role="dialog" aria-label={shTitle}>
                <div className="grab" aria-hidden="true" />
                <div className="sh-h">
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {sv0 && vmode !== "detail" && (
                      <button type="button" className="xbtn" aria-label="Back" onClick={() => setVMode("detail")}>
                        <Chev dir="l" />
                      </button>
                    )}
                    <b style={{ fontSize: 17 }}>{shTitle}</b>
                  </span>
                  <button type="button" className="xbtn" aria-label="Close" onClick={() => setSheet(null)}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0E1F3D" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
                {sv0 && renderVisitSheet()}
                {sheet?.kind === "fab" && (
                  <div className="sh-b">
                    <div className="menu">
                      <button type="button" className="mi" onClick={() => { setSheet({ kind: "addVisit" }); setTmp({ aCid: "", aDate: sel, aWin: "afternoon", aT: "13:00", aPrice: "" }); }}>
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0E1F3D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
                        </svg>
                        Add visit
                      </button>
                      <button type="button" className="mi" onClick={() => { setSheet(null); setView("add"); setForm(blankForm()); setFq(""); }}>
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0E1F3D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.5 3.2-6 6.5-6s6 2.5 6.5 6M19 8v6M16 11h6" />
                        </svg>
                        Add customer
                      </button>
                      <Link className="mi" href="/admin/links/new">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0E1F3D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={NAV_ICONS.links} />
                        </svg>
                        Create booking link
                      </Link>
                    </div>
                  </div>
                )}
                {sheet?.kind === "addVisit" && renderAddVisit()}
                {sheet?.kind === "renew" && renderRenew()}
                {sheet?.kind === "change" && renderChange()}
                {sheet?.kind === "cancelPlan" && renderCancelPlan()}
              </section>
            </div>
          )}
        </div>

        {(view === "cal" || view === "customers") && !sheetOn && (
          <button type="button" className="fab" aria-label="Add" onClick={() => setSheet({ kind: "fab" })}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0E1F3D" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}

        {toast && (
          <div className="toast" role="status">
            <span>{toast.text}</span>
            {toast.act && (
              <button type="button" className="linkbtn" onClick={toast.act}>
                {toast.actLabel}
              </button>
            )}
            {toast.href && (
              <a className="linkbtn" href={toast.href}>
                {toast.hrefLabel}
              </a>
            )}
          </div>
        )}

        <nav className="btabs" aria-label="Admin sections">
          <button type="button" className={tabCal ? "bt on" : "bt"} aria-current={tabCal ? "page" : undefined} onClick={goView("cal")}>
            <NavIcon d={NAV_ICONS.cal} on={tabCal} />
            Calendar
          </button>
          <button type="button" className={tabCust ? "bt on" : "bt"} aria-current={tabCust ? "page" : undefined} onClick={goView("customers")}>
            <NavIcon d={NAV_ICONS.cust} on={tabCust} />
            Customers
          </button>
          <Link className="bt" href="/admin/links">
            <NavIcon d={NAV_ICONS.links} />
            Links
          </Link>
          <Link className="bt" href="/admin/submissions">
            <NavIcon d={NAV_ICONS.subs} />
            Requests
          </Link>
          <Link className="bt" href="/admin/prices">
            <NavIcon d={NAV_ICONS.prices} />
            Prices
          </Link>
        </nav>
      </div>
    </div>
  );
}

