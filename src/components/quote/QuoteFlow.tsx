"use client";

/*
 * Quote form page, ported 1:1 from the Claude Design file
 * (Crystal Clean Brand Identity canvas → "Page 2 · Quote form").
 * Styles: src/app/quote/qp.css. Answers are saved in the browser as the visitor goes.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { STORAGE_KEY, isInServiceArea, isZipValid, textUsHref } from "@/config/site";
import { track } from "@/lib/fbq";

type State = {
  zip: string;
  type: "" | "home" | "rental";
  beds: number;
  baths: number;
  size: string;
  last: string;
  freq: string;
  rplan: string;
  ex: Record<string, boolean>;
  showAll: boolean;
  days: string[];
  wins: string[];
  name: string;
  phone: string;
  addr: string;
  notes: string;
  noteOpen?: boolean;
  step: number;
  waitPhone: string;
  waitDone: boolean;
  editStart: boolean;
};

const DEF: State = {
  zip: "",
  type: "",
  beds: 2,
  baths: 2,
  size: "",
  last: "",
  freq: "biweekly",
  rplan: "synced",
  ex: {},
  showAll: false,
  days: [],
  wins: [],
  name: "",
  phone: "",
  addr: "",
  notes: "",
  step: 1,
  waitPhone: "",
  waitDone: false,
  editStart: false,
};

const SIZES = ["Under 1,000 sq ft", "1,000–1,499 sq ft", "1,500–1,999 sq ft", "2,000–2,499 sq ft", "2,500–2,999 sq ft", "3,000–3,999 sq ft", "4,000+ sq ft"];
const PLANS: [string, string, string, string][] = [
  ["weekly", "Every week", "", "Always guest-ready"],
  ["biweekly", "Every 2 weeks", "Most popular", "The sweet spot for most homes"],
  ["fourweek", "Monthly", "", "A monthly reset"],
  ["once", "One time", "", "A single clean, no plan"],
];
const LAST: [string, string][] = [
  ["2w", "Within 2 weeks"],
  ["1m", "2 to 4 weeks"],
  ["3m1", "1 to 3 months"],
  ["3m", "More than 3 months"],
  ["never", "Never"],
];
const I = {
  bed: "M3 19V7M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-7v5",
  fridge: "M6 3h12v18H6zM6 10h12M9 6v2M9 13v3",
  oven: "M3.5 4h17v16h-17zM3.5 9h17M7 12h10v5H7z",
  win: "M4 3.5h16v17H4zM12 3.5v17M4 12h16",
  sun: "M12 5.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2.5V4M5.5 9H4M20 9h-1.5M3 20h18M6 20v-4h12v4",
  shirt: "M8 3 3.5 6l2 4 2.5-1V21h8V9l2.5 1 2-4L16 3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z",
  cab: "M4 4h16v16H4zM12 4v16M10 11v2M14 11v2",
  lines: "M4 4h16M5 8h14M5 12h14M5 16h14M3 20h18",
  garage: "M3 10 12 4l9 6v10H3zM7 20v-7h10v7M7 16.5h10",
  paw: "M8.5 17.5c0-2.8 2-5 4.3-5s4.2 2.2 4.2 4.5c0 1.8-1.4 2.5-2.9 2.1-1-.3-1.8-.3-2.8 0-1.6.5-2.8-.1-2.8-1.6zM7 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM15.5 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM18 9.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  linen: "M4 7h16v3.5H4zM4 13.5h16V17H4zM6 20h12",
  basket: "M4 10h16l-1.5 9h-13zM8 10 11 4M16 10l-3-6",
  cam: "M4 8h3l2-3h6l2 3h3v11H4zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
};
type Ex = [string, string, string, string];
const HOME_EX: Ex[] = [
  ["sheets", "Bed sheet change", "Fresh sheets on every bed", I.bed],
  ["fridge", "Inside the fridge", "Emptied, wiped and organized", I.fridge],
  ["oven", "Inside the oven", "Racks, door and interior degreased", I.oven],
  ["windows", "Interior windows", "Glass, sills and tracks", I.win],
  ["exterior", "Exterior cleaning", "Lanai, patio and entryway. No pressure washing.", I.sun],
  ["laundry", "Laundry", "One load washed, dried and folded", I.shirt],
];
const MORE_EX: Ex[] = [
  ["cabinets", "Inside cabinets", "Emptied, wiped and put back", I.cab],
  ["baseboards", "Baseboards and blinds", "Hand-wiped throughout", I.lines],
  ["garage", "Garage sweep", "Floor swept, cobwebs cleared", I.garage],
  ["pet", "Pet hair treatment", "Extra vacuuming and lint removal", I.paw],
];
const HOST_EX: Ex[] = [
  ["linen", "Linen change and restock", "Beds made hotel-style, spares staged", I.linen],
  ["supplies", "Guest supplies restock", "Paper goods, soap and coffee from your stock", I.basket],
  ["damage", "Damage and inventory photo report", "Every room photographed for you", I.cam],
];
const DAYS: [string, string][] = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["any", "Any day works"],
];
const WINS: [string, string][] = [
  ["morning", "Morning · 8–11 am"],
  ["midday", "Midday · 11 am–2 pm"],
  ["afternoon", "Afternoon · 2–5 pm"],
  ["any", "Any time"],
];
const STEP_NAMES = ["Your home", "Last clean", "How often", "Extras", "Your details"];

const Ck = ({ size = 13 }: { size?: number }) => (
  <span className="ck" aria-hidden="true">
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#0E1F3D" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
  </span>
);

function toggleList(arr: string[], k: string) {
  const a = (arr || []).slice();
  if (k === "any") return a.includes("any") ? [] : ["any"];
  const b = a.filter((x) => x !== "any");
  const i = b.indexOf(k);
  if (i >= 0) b.splice(i, 1);
  else b.push(k);
  return b;
}

function load(): Partial<State> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function QuoteFlow() {
  const params = useSearchParams();
  const [s, setS] = useState<State>(DEF);
  const [ready, setReady] = useState(false);
  const [tried, setTried] = useState(0);
  const [mOpen, setMOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");

  useEffect(() => {
    const saved = load();
    const st: State = { ...DEF, ...saved, step: saved.step === 6 ? 1 : saved.step || 1 };
    const zip = params.get("zip");
    const type = params.get("type");
    if (zip && isZipValid(zip) && zip !== st.zip) {
      st.zip = zip;
      st.step = 1;
    }
    if ((type === "home" || type === "rental") && type !== st.type) {
      st.type = type;
      st.step = 1;
    }
    setS(st);
    setReady(true);
  }, [params]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s, ready]);

  const set = (o: Partial<State>) => setS((p) => ({ ...p, ...o }));
  const zipOk = isZipValid(s.zip);
  const inArea = isInServiceArea(s.zip);
  const isRental = s.type === "rental";
  const isHome = s.type === "home";
  const haveStart = inArea && !!s.type;
  const askStart = !haveStart || s.editStart;
  const step1Done = haveStart && s.size !== "";
  const canNext: Record<number, boolean> = {
    1: step1Done,
    2: !!s.last,
    3: true,
    4: true,
    5: !!(s.name.trim() && s.phone.trim() && s.addr.trim() && s.days.length && s.wins.length),
  };
  const go = (n: number) => {
    setTried(0);
    set({ step: n, editStart: n === 1 ? s.editStart : false });
    window.scrollTo({ top: 0 });
  };
  const next = async () => {
    if (!canNext[s.step]) return setTried(s.step);
    if (s.step === 5) return submit();
    setTried(0);
    set({ step: s.step + 1, editStart: false });
    window.scrollTo({ top: 0 });
  };
  const back = () => go(Math.max(1, s.step - 1));

  const exDefs = (isRental ? HOST_EX : []).concat(HOME_EX).concat(s.showAll ? MORE_EX : []);
  const allEx = HOST_EX.concat(HOME_EX).concat(MORE_EX);
  const exChosen = allEx.filter((e) => s.ex[e[0]] && (isRental || HOST_EX.every((h) => h[0] !== e[0]))).map((e) => e[1]);
  const bedsLabel = s.beds === 0 ? "Studio" : s.beds === 6 ? "6+" : String(s.beds);
  const bathsLabel = s.baths >= 6 ? "6+" : Math.floor(s.baths) + (s.baths % 1 ? "½" : "");
  const plan = PLANS.find((x) => x[0] === s.freq) || PLANS[1];
  const homeWord = isRental ? "Vacation rental" : "Home";
  const summaryLine =
    `${homeWord} in ${s.zip} · ${s.beds === 0 ? "Studio" : bedsLabel + " bed"} · ${bathsLabel} bath · ` +
    (isRental ? (s.rplan === "synced" ? "Turnover plan" : "Per turnover") : plan[1]) +
    (exChosen.length ? ` · ${exChosen.length} ${exChosen.length === 1 ? "extra" : "extras"}` : "");
  const firstName = s.name.trim().split(" ")[0] || "thanks";
  const step = Math.min(s.step, 5);
  const err1 = !inArea ? "Add a ZIP code we serve to continue." : !s.type ? "Choose home or vacation rental to continue." : "Choose your home size to continue.";
  const err5 = !s.days.length || !s.wins.length ? 'Pick at least one day and one time of day (or "Any").' : "Please add your name, mobile number and street address.";
  const noteOpen = !!s.noteOpen || !!s.notes.trim();

  async function submit() {
    setSending(true);
    setSendErr("");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip: s.zip,
          type: s.type,
          bedrooms: bedsLabel,
          bathrooms: bathsLabel,
          size: SIZES[Number(s.size)] ?? "",
          lastClean: (LAST.find((x) => x[0] === s.last) || ["", ""])[1],
          plan: isRental ? (s.rplan === "synced" ? "Turnover plan, calendar synced" : "Per turnover, as booked") : plan[1],
          extras: exChosen,
          days: s.days.map((d) => (DAYS.find((x) => x[0] === d) || ["", d])[1]),
          timeOfDay: s.wins.map((w) => (WINS.find((x) => x[0] === w) || ["", w])[1]),
          name: s.name,
          phone: s.phone,
          address: s.addr,
          notes: s.notes,
        }),
      });
      if (!res.ok) throw new Error();
      setTried(0);
      track("Lead", { content_name: s.type === "rental" ? "Vacation rental quote" : "Home cleaning quote" });
      set({ step: 6 });
      window.scrollTo({ top: 0 });
    } catch {
      setSendErr("Something went wrong sending your request. Please try again, or text us.");
    } finally {
      setSending(false);
    }
  }

  async function joinWait() {
    if (s.waitPhone.replace(/\D/g, "").length < 10) return;
    const r = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zip: s.zip, phone: s.waitPhone }),
    }).catch(() => null);
    if (r?.ok) {
      track("Lead", { content_name: "Waitlist" });
      set({ waitDone: true });
    }
  }

  const typeButtons = (
    <div className="types">
      <button type="button" className={isHome ? "opt sel" : "opt"} aria-pressed={isHome} onClick={() => set({ type: "home" })}>
        <span className="opt-t">My home</span>
      </button>
      <button type="button" className={isRental ? "opt sel" : "opt"} aria-pressed={isRental} onClick={() => set({ type: "rental" })}>
        <span className="opt-t">A vacation rental</span>
        <span className="opt-s">Airbnb / VRBO</span>
      </button>
    </div>
  );
  const navrow = (
    <div className="navrow">
      <button type="button" className="linkbtn" onClick={back}>
        Back
      </button>
      <button type="button" className="btn btn-lg" onClick={next}>
        Continue
      </button>
    </div>
  );

  return (
    <div className="qp" style={{ visibility: ready ? "visible" : "hidden" }}>
      <header className="hdr">
        <div className="wrap">
          <div className="hdr-in">
            <Link href="/" className="logo" aria-label="Crystal Clean home page">
              <svg viewBox="0 0 560 70" width="112" height="14" aria-hidden="true">
                <path d="M4 64H190L280 10L370 64H556" fill="none" stroke="#C9A25E" strokeWidth="5.5" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M322 6q0 10 10 10q-10 0-10 10q0-10-10-10q10 0 10-10Z" fill="#C9A25E" />
              </svg>
              <span className="logo-word">Crystal Clean</span>
            </Link>
            <a className="txt-link" href={textUsHref}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0E1F3D" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.3-4A8 8 0 1 1 20 12z" />
              </svg>
              Text us
            </a>
          </div>
          {s.step < 6 && (
            <div className="prog-wrap">
              <div className="progress" role="progressbar" aria-label="Quote progress" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className={n <= s.step ? "seg on" : "seg"} />
                ))}
              </div>
              <div className="plabel">
                Step {step} of 5 · {STEP_NAMES[step - 1]}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="wrap main">
        <div>
          <div className="mbar">
            <button type="button" className="mbar-btn" aria-expanded={mOpen} onClick={() => setMOpen(!mOpen)}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Ck />
                Exact price by text · Flexible plans
              </span>
              <span aria-hidden="true">{mOpen ? "−" : "+"}</span>
            </button>
            {mOpen && (
              <ul className="checks">
                <li>
                  <Ck />
                  An exact price by text, based on your home
                </li>
                <li>
                  <Ck />
                  Flexible plans: one-time, weekly, every 2 weeks or monthly
                </li>
                <li>
                  <Ck />
                  The same team every visit
                </li>
              </ul>
            )}
          </div>

          <div className="card formc">
            {haveStart && !askStart && s.step < 5 && (
              <div className="carry">
                <span>
                  {homeWord} in {s.zip}
                </span>
                <button type="button" className="linkbtn" aria-label="Edit ZIP code and home type" onClick={() => { setTried(0); set({ step: 1, editStart: true }); }}>
                  Edit
                </button>
              </div>
            )}

            {s.step === 1 && (
              <>
                <h1 className="qtitle">Tell us about your home</h1>
                <p className="sub">About 2 minutes. Home details first, contact details last.</p>
                {askStart && (
                  <>
                    <label className="field">
                      <span className="lbl">What&apos;s your ZIP code?</span>
                      <input
                        className="input"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="e.g. 32801"
                        value={s.zip}
                        onChange={(e) => set({ zip: e.target.value.replace(/\D/g, "").slice(0, 5), waitDone: false })}
                      />
                    </label>
                    {inArea && <div className="ok">Good news, we clean in your area.</div>}
                    <div className="field">
                      <span className="lbl">What are we cleaning?</span>
                      {typeButtons}
                    </div>
                  </>
                )}
                {zipOk && !inArea && (
                  <div className="nudge">
                    <b>We&apos;re not in your area yet.</b> Leave your mobile number and we&apos;ll text you as soon as we are.
                    {!s.waitDone && (
                      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                        <label className="sr" htmlFor="wl">
                          Mobile number for the waitlist
                        </label>
                        <input id="wl" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="Mobile number" value={s.waitPhone} onChange={(e) => set({ waitPhone: e.target.value })} />
                        <button type="button" className="btn" onClick={joinWait}>
                          Join
                        </button>
                      </div>
                    )}
                    {s.waitDone && <div className="ok">You&apos;re on the list. We&apos;ll be in touch.</div>}
                  </div>
                )}
                <div className="row2">
                  <div className="field">
                    <span className="lbl" id="bd">
                      Bedrooms
                    </span>
                    <div className="stepper" role="group" aria-labelledby="bd">
                      <button type="button" aria-label="Fewer bedrooms" disabled={s.beds <= 0} onClick={() => set({ beds: Math.max(0, s.beds - 1) })}>
                        −
                      </button>
                      <div className="val" aria-live="polite">
                        {bedsLabel}
                      </div>
                      <button type="button" aria-label="More bedrooms" disabled={s.beds >= 6} onClick={() => set({ beds: Math.min(6, s.beds + 1) })}>
                        +
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <span className="lbl" id="ba">
                      Bathrooms
                    </span>
                    <div className="stepper" role="group" aria-labelledby="ba">
                      <button type="button" aria-label="Fewer bathrooms" disabled={s.baths <= 1} onClick={() => set({ baths: Math.max(1, s.baths - 0.5) })}>
                        −
                      </button>
                      <div className="val" aria-live="polite">
                        {bathsLabel}
                      </div>
                      <button type="button" aria-label="More bathrooms" disabled={s.baths >= 6} onClick={() => set({ baths: Math.min(6, s.baths + 0.5) })}>
                        +
                      </button>
                    </div>
                    <div className="help">A half bath has a toilet and sink, no shower.</div>
                  </div>
                </div>
                <label className="field">
                  <span className="lbl">Home size</span>
                  <select className="input" value={s.size} onChange={(e) => set({ size: e.target.value })}>
                    <option value="">Choose a size range</option>
                    {SIZES.map((z, i) => (
                      <option key={z} value={String(i)}>
                        {z}
                      </option>
                    ))}
                  </select>
                  <span className="help" style={{ display: "block" }}>
                    Not sure? Zillow or your listing has it.
                  </span>
                </label>
                {tried === 1 && (
                  <div className="err" role="alert">
                    {err1}
                  </div>
                )}
                <div className="navrow">
                  <Link className="linkbtn" href="/">
                    Back
                  </Link>
                  <button type="button" className="btn btn-lg" onClick={next}>
                    Continue
                  </button>
                </div>
              </>
            )}

            {s.step === 2 && (
              <>
                <h1 className="qtitle">When was your last professional clean?</h1>
                <p className="sub">This helps us know if your first visit should be a deep clean.</p>
                <div className="chips" role="group" aria-label="Last professional clean">
                  {LAST.map(([k, label]) => (
                    <button key={k} type="button" className={s.last === k ? "chip sel" : "chip"} aria-pressed={s.last === k} onClick={() => set({ last: k })}>
                      {label}
                    </button>
                  ))}
                </div>
                {tried === 2 && (
                  <div className="err" role="alert">
                    Pick one to continue.
                  </div>
                )}
                {navrow}
              </>
            )}

            {s.step === 3 && !isRental && (
              <>
                <h1 className="qtitle">How often would you like a sparkling home?</h1>
                <div className="plans" role="group" aria-label="Cleaning plan">
                  {PLANS.map(([k, label, badge, desc]) => (
                    <button key={k} type="button" className={s.freq === k ? "opt sel" : "opt"} aria-pressed={s.freq === k} onClick={() => set({ freq: k })}>
                      {badge && <span className="badge">{badge}</span>}
                      <span className="opt-t">{label}</span>
                      <span className="opt-s">{desc}</span>
                    </button>
                  ))}
                </div>
                <div className="perks">
                  {["Same team every visit", "Priority booking", "Supplies included"].map((t) => (
                    <div className="perk" key={t}>
                      <Ck />
                      {t}
                    </div>
                  ))}
                </div>
                <p style={{ margin: "14px 0 0", fontWeight: 700 }}>
                  Not sure which plan? Text us and we&apos;ll help you choose.
                </p>
                {navrow}
              </>
            )}

            {s.step === 3 && isRental && (
              <>
                <h1 className="qtitle">How would you like to book turnovers?</h1>
                <div className="plans" role="group" aria-label="Turnover plan">
                  <button type="button" className={s.rplan === "once" ? "opt sel" : "opt"} aria-pressed={s.rplan === "once"} onClick={() => set({ rplan: "once" })}>
                    <span className="opt-t">Per turnover, as booked</span>
                    <span className="opt-s">Request each clean when you need it.</span>
                  </button>
                  <button type="button" className={s.rplan === "synced" ? "opt sel" : "opt"} aria-pressed={s.rplan === "synced"} onClick={() => set({ rplan: "synced" })}>
                    <span className="badge">Recommended for hosts</span>
                    <span className="opt-t">Turnover plan, synced to my booking calendar</span>
                    <span className="opt-s" style={{ color: "#7A5D27", fontWeight: 700 }}>
                      Same-day turnovers
                    </span>
                  </button>
                </div>
                <div className="perks">
                  {["Photo report every turnover", "Synced with Airbnb / VRBO", "Supplies included"].map((t) => (
                    <div className="perk" key={t}>
                      <Ck />
                      {t}
                    </div>
                  ))}
                </div>
                <p style={{ margin: "14px 0 0", fontWeight: 700 }}>
                  Not sure which option? Text us and we&apos;ll help you choose.
                </p>
                {navrow}
              </>
            )}

            {s.step === 4 && (
              <>
                <h1 className="qtitle">Want us to take care of anything else?</h1>
                <p className="sub">Optional. Tap to add.</p>
                <div className="extras">
                  {exDefs.map(([k, name, desc, icon]) => {
                    const on = !!s.ex[k];
                    return (
                      <button key={k} type="button" className={on ? "tile sel" : "tile"} aria-pressed={on} onClick={() => set({ ex: { ...s.ex, [k]: !on } })}>
                        {on && (
                          <span className="tick" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0E1F3D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 12 5 5 9-10" />
                            </svg>
                          </span>
                        )}
                        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#0E1F3D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={icon} />
                        </svg>
                        <span className="tn">{name}</span>
                        <span className="td">{desc}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  <button type="button" className="linkbtn" aria-expanded={s.showAll} onClick={() => set({ showAll: !s.showAll })}>
                    {s.showAll ? "Show fewer extras" : "See all extras"}
                  </button>
                  <button type="button" className="linkbtn" onClick={() => { setTried(0); set({ ex: {}, step: 5 }); }}>
                    Skip, no extras
                  </button>
                </div>
                {navrow}
              </>
            )}

            {s.step === 5 && (
              <>
                <h1 className="qtitle">Last step: when and where</h1>
                <div className="carry" style={{ marginTop: 14 }}>
                  <span style={{ fontWeight: 500 }}>{summaryLine}</span>
                  <button type="button" className="linkbtn" aria-label="Edit your home answers" onClick={() => { setTried(0); set({ step: 1, editStart: false }); }}>
                    Edit
                  </button>
                </div>
                <div className="field">
                  <span className="lbl" id="dlbl">
                    Which days usually work best?
                  </span>
                  <div className="chips" role="group" aria-labelledby="dlbl" style={{ marginTop: 4 }}>
                    {DAYS.map(([k, label]) => {
                      const on = s.days.includes(k);
                      return (
                        <button key={k} type="button" className={on ? "chip sel" : "chip"} aria-pressed={on} onClick={() => set({ days: toggleList(s.days, k) })}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="field">
                  <span className="lbl" id="plbl">
                    What time of day?
                  </span>
                  <div className="chips" role="group" aria-labelledby="plbl" style={{ marginTop: 4 }}>
                    {WINS.map(([k, label]) => {
                      const on = s.wins.includes(k);
                      return (
                        <button key={k} type="button" className={on ? "chip sel" : "chip"} aria-pressed={on} onClick={() => set({ wins: toggleList(s.wins, k) })}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="field">
                  <span className="lbl">Your name</span>
                  <input className="input" autoComplete="name" value={s.name} onChange={(e) => set({ name: e.target.value })} />
                </label>
                <label className="field">
                  <span className="lbl">Mobile number</span>
                  <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={s.phone} onChange={(e) => set({ phone: e.target.value })} />
                  <span className="help" style={{ display: "block" }}>
                    We&apos;ll text your exact price here.
                  </span>
                </label>
                <label className="field">
                  <span className="lbl">Street address</span>
                  <input className="input" autoComplete="street-address" placeholder="Include apt or gate code" value={s.addr} onChange={(e) => set({ addr: e.target.value })} />
                </label>
                {!noteOpen && (
                  <button type="button" className="linkbtn" style={{ marginTop: 10 }} onClick={() => set({ noteOpen: true })}>
                    + Add a note (pets, focus areas)
                  </button>
                )}
                {noteOpen && (
                  <label className="field">
                    <span className="lbl">
                      Anything we should know? <span className="opt-lbl">(optional)</span>
                    </span>
                    <textarea className="input" placeholder="Pets, focus areas, how to get in" value={s.notes} onChange={(e) => set({ notes: e.target.value })} />
                  </label>
                )}
                {tried === 5 && (
                  <div className="err" role="alert">
                    {err5}
                  </div>
                )}
                {sendErr && (
                  <div className="err" role="alert">
                    {sendErr}
                  </div>
                )}
                <button type="button" className="btn btn-lg btn-block" style={{ marginTop: 24 }} onClick={next} disabled={sending}>
                  {sending ? "Sending…" : "Send my quote request"}
                </button>
                <p className="fr">Free, no commitment. We never share your info.</p>
                <div className="navrow" style={{ marginTop: 6 }}>
                  <button type="button" className="linkbtn" onClick={back}>
                    Back
                  </button>
                  <a href={textUsHref} style={{ fontWeight: 700 }}>
                    Questions? Text us
                  </a>
                </div>
              </>
            )}

            {s.step === 6 && (
              <>
                <div style={{ textAlign: "center", padding: "6px 0" }}>
                  <svg viewBox="0 0 64 64" width="80" height="80" aria-hidden="true">
                    <circle cx="32" cy="32" r="31" fill="#0E1F3D" />
                    <path d="M17 29 32 18 47 29" fill="none" stroke="#C9A25E" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="m24 37 6 6 11-12" fill="none" stroke="#C9A25E" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h1 className="qtitle" style={{ marginTop: 10 }}>
                    Got it, {firstName}!
                  </h1>
                  <p style={{ margin: "8px 0 0", fontSize: 19 }}>We&apos;re reviewing your home and will text you your exact price.</p>
                </div>
                <div className="ty-steps">
                  {[
                    ["We review your home", "Our team checks the details you sent."],
                    ["You get your exact price by text", "Exact, not a range or a guess."],
                    ["Reply YES to book", "The same team every visit."],
                  ].map(([t, d], i) => (
                    <div className="ty-step" key={t}>
                      <div className="mini" style={{ marginBottom: 8 }}>
                        {i + 1}
                      </div>
                      <b>{t}</b>
                      <div className="help">{d}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
                  <a className="btn btn-lg" href={textUsHref}>
                    Text us
                  </a>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
                  <button type="button" className="linkbtn" onClick={() => { setTried(0); setS(DEF); }}>
                    Start a new quote
                  </button>
                  <Link className="linkbtn" href="/">
                    Back to Crystal Clean
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="card side" aria-label="Why Crystal Clean">
          <h2>Why Crystal Clean</h2>
          <ul className="checks">
            <li>
              <Ck />
              <span>
                <b>An exact price by text</b>, based on your actual home
              </span>
            </li>
            <li>
              <Ck />
              <span>
                <b>Flexible plans:</b> one-time, weekly, every 2 weeks or monthly
              </span>
            </li>
            <li>
              <Ck />
              <span>
                <b>The same team</b> every visit
              </span>
            </li>
          </ul>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #E4DED3", fontSize: 15 }}>
            Have a question?{" "}
            <a href={textUsHref} style={{ fontWeight: 700 }}>
              Text us
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
