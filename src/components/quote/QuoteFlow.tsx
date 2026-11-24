"use client";

/*
 * Shorter quote form, ported from the Claude Design file
 * (Crystal Clean Brand Identity canvas → "Quick" quote form).
 * 3 steps: your home → your price → where to text it. The lead is saved (and the Meta Lead
 * event fires) as soon as name and mobile are sent. Everything else is optional and comes after.
 * Styles: src/app/quote/qp.css. Answers are saved in the browser as the visitor goes.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { STORAGE_KEY, isInServiceArea, isZipValid, site, textUsHref } from "@/config/site";
import { track, trackCustom } from "@/lib/fbq";
import { DEFAULT_PRICES, MAX_PRICED_BEDS, startingPrice, type PriceTable } from "@/lib/pricing";

type Step = 1 | 2 | 3 | 4;
type Opt = "open" | "sent" | "skipped";
type Freq = "weekly" | "biweekly" | "monthly" | "once";

type State = {
  step: Step;
  zip: string;
  type: "home" | "rental";
  freq: Freq;
  beds: number;
  baths: number;
  name: string;
  phone: string;
  leadId: string;
  waitPhone: string;
  waitDone: boolean;
  size: string;
  last: string;
  ex: Record<string, boolean>;
  showAll: boolean;
  days: string[];
  wins: string[];
  addr: string;
  notes: string;
  opt: Opt;
};

const DEF: State = {
  step: 1,
  zip: "",
  type: "home",
  freq: "biweekly",
  beds: 2,
  baths: 2,
  name: "",
  phone: "",
  leadId: "",
  waitPhone: "",
  waitDone: false,
  size: "",
  last: "",
  ex: {},
  showAll: false,
  days: [],
  wins: [],
  addr: "",
  notes: "",
  opt: "open",
};

/** [key, chip label, plan name saved with the lead (matches booking links), price line] */
const FREQS: [Freq, string, string, string][] = [
  ["weekly", "Every week", "Every week", "per clean, every week"],
  ["biweekly", "Every 2 weeks", "Every 2 weeks", "per clean, every 2 weeks"],
  ["monthly", "Monthly", "Monthly", "per clean, monthly"],
  ["once", "One time", "One time", "one-time clean"],
];
const STEP_NAMES = ["Your home", "Your price", "Where to text it"];
const SIZES = ["Under 1,000 sq ft", "1,000–1,499 sq ft", "1,500–1,999 sq ft", "2,000–2,499 sq ft", "2,500–2,999 sq ft", "3,000–3,999 sq ft", "4,000+ sq ft"];
const LASTS = ["Within 2 weeks", "2 to 4 weeks", "1 to 3 months", "More than 3 months", "Never"];
const EXTRAS: [string, string, string][] = [
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
];
/** Labels match the old form so booking links still recognize them. */
const DAYS: [string, string, string][] = [
  ["mon", "Mon", "Monday"],
  ["tue", "Tue", "Tuesday"],
  ["wed", "Wed", "Wednesday"],
  ["thu", "Thu", "Thursday"],
  ["fri", "Fri", "Friday"],
  ["sat", "Sat", "Saturday"],
  ["any", "Any day", "Any day works"],
];
const WINS: [string, string][] = [
  ["morning", "Morning · 8–11 am"],
  ["midday", "Midday · 11 am–2 pm"],
  ["afternoon", "Afternoon · 2–5 pm"],
  ["any", "Any time"],
];

/** Town names for "Good news, we clean in …". Anything else in the area says "your area". */
const CITY: Record<string, string> = {
  "32789": "Winter Park", "32790": "Winter Park", "32792": "Winter Park", "34761": "Ocoee", "34786": "Windermere", "34787": "Winter Garden",
  "34741": "Kissimmee", "34743": "Kissimmee", "34744": "Kissimmee", "34746": "Kissimmee", "34747": "Kissimmee", "34758": "Poinciana", "34759": "Poinciana",
  "34769": "St. Cloud", "34771": "St. Cloud", "34772": "St. Cloud", "34711": "Clermont", "34714": "Clermont", "34715": "Minneola", "34736": "Groveland",
  "32827": "Lake Nona", "32832": "Lake Nona", "32751": "Maitland", "32708": "Winter Springs", "32746": "Lake Mary", "32765": "Oviedo", "32766": "Oviedo",
  "32703": "Apopka", "32712": "Apopka", "32750": "Longwood", "32779": "Longwood", "32771": "Sanford", "32773": "Sanford", "32707": "Casselberry",
  "32701": "Altamonte Springs", "32714": "Altamonte Springs", "32757": "Mount Dora", "34734": "Gotha",
  "33837": "Davenport", "33896": "Four Corners", "33897": "ChampionsGate", "33898": "Reunion", "33844": "Haines City", "33845": "Haines City",
  "33823": "Auburndale", "33830": "Bartow", "33850": "Lake Alfred", "33853": "Lake Wales", "33859": "Lake Wales", "33868": "Polk City",
};
const cityFor = (zip: string) => {
  const n = Number(zip);
  if (CITY[zip]) return CITY[zip];
  if (n >= 32801 && n <= 32839) return "Orlando";
  if (n >= 33801 && n <= 33815) return "Lakeland";
  if (n >= 33880 && n <= 33884) return "Winter Haven";
  return "your area";
};

const digits = (p: string) => String(p || "").replace(/\D/g, "");
const fmtPhone = (v: string) => {
  let d = digits(v);
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
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

const Ck = ({ size = 13, box }: { size?: number; box?: number }) => (
  <span className="ck" aria-hidden="true" style={box ? { width: box, height: box } : undefined}>
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#0E1F3D" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
  </span>
);
const Tick = () => (
  <span className="tick" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0E1F3D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
  </span>
);
const Sparkle = ({ size }: { size: number }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M10 0q0 10 10 10q-10 0-10 10q0-10-10-10q10 0 10-10Z" fill="#C9A25E" />
  </svg>
);

export function QuoteFlow({ prices = DEFAULT_PRICES }: { prices?: PriceTable }) {
  const params = useSearchParams();
  const [s, setS] = useState<State>(DEF);
  const [ready, setReady] = useState(false);
  const [tried, setTried] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const viewed = useRef(false);

  // Holiday deep-clean version: ?ad=deep, or ad 2's link (utm_content=2-deep-clean…).
  const source = params.get("utm_content") || "";
  const isDeep = params.get("ad") === "deep" || /deep/i.test(source);

  useEffect(() => {
    const saved = load();
    const st: State = { ...DEF, ...saved };
    // A finished request starts over, keeping the home details and contact info.
    if (st.step === 4 || ![1, 2, 3].includes(st.step)) Object.assign(st, { step: 1, leadId: "", opt: "open" });
    const zip = params.get("zip");
    const type = params.get("type");
    if (zip && isZipValid(zip)) st.zip = zip;
    if (type === "home" || type === "rental") st.type = type;
    // ?plan=once (or weekly, biweekly, monthly) preselects the frequency, e.g. for a one-time clean ad.
    const plan = FREQS.find((f) => f[0] === params.get("plan"));
    if (plan) st.freq = plan[0];
    setS(st);
    setReady(true);
    if (!viewed.current) {
      viewed.current = true;
      track("ViewContent", { content_name: isDeep ? "Holiday deep clean quote" : "Quote form" });
    }
  }, [params, isDeep]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s, ready]);

  const set = (o: Partial<State>) => setS((p) => ({ ...p, ...o }));
  const go = (step: Step) => {
    setTried(0);
    setSendErr("");
    set({ step });
    window.scrollTo({ top: 0 });
    if (step === 2 || step === 3) trackCustom("QuoteStep", { step, step_name: STEP_NAMES[step - 1], deep: isDeep });
  };

  const zipOk = isZipValid(s.zip);
  const inArea = isInServiceArea(s.zip);
  const isRental = s.type === "rental";
  const isHome = !isRental;
  const freq = FREQS.find((f) => f[0] === s.freq) || FREQS[1];
  const kind = isDeep ? "deep" : isRental ? "rental" : freq[0];
  const plan = isDeep ? "One time (holiday deep clean)" : isRental ? "Per turnover" : freq[2];
  const amount = startingPrice(kind, s.beds, s.baths, prices);
  const big = s.beds > MAX_PRICED_BEDS;
  const price = amount === null ? "" : `$${amount}`;
  const bedsLabel = s.beds === 0 ? "Studio" : big ? `${MAX_PRICED_BEDS + 1}+` : String(s.beds);
  const bathsLabel = s.baths >= 6 ? "6+" : Math.floor(s.baths) + (s.baths % 1 ? "½" : "");
  const bedTxt = s.beds === 0 ? "Studio" : `${bedsLabel} bed`;
  const summary = `${isRental ? "Rental" : "Home"} in ${s.zip} · ${bedTxt} · ${bathsLabel} bath`;
  const ask =
    `Hi Kyle, I'd like a price for ${isDeep ? "a holiday deep clean for " : ""}a ${s.beds === 0 ? "studio" : `${bedsLabel} bed`}, ${bathsLabel} bath ` +
    `${isRental ? "vacation rental" : "home"}${zipOk ? ` in ${s.zip}` : ""}.`;
  const smsWithBody = `${textUsHref}?&body=${encodeURIComponent(ask)}`;
  const phoneOk = digits(s.phone).length === 10;
  const nameBad = tried === 3 && !s.name.trim();
  const phoneBad = tried === 3 && !phoneOk;
  const err1 = tried === 1 ? (!zipOk ? "Enter your 5-digit ZIP code." : "") : "";
  const firstName = s.name.trim().split(" ")[0] || "thanks";

  const priceHead = isDeep ? "Holiday deep cleans start at" : isRental ? "Great news, rentals like yours start at" : "Great news, homes like yours start at";
  const badge = isDeep ? "Holiday deep clean" : isRental ? "Turnover clean" : freq[0] === "biweekly" ? "Most popular plan" : freq[0] === "once" ? "One-time clean" : freq[1];
  const per = big ? "Larger homes are priced by Kyle" : isDeep ? "one-time deep clean" : isRental ? "per turnover" : freq[3];
  const mutedLine = isDeep
    ? "Room by room: baseboards, vents, light switches and grout. Kyle texts your exact price."
    : isRental
      ? "Turnovers timed to your guest checkouts. Kyle texts your exact price."
      : "No contracts, change your plan anytime. Kyle texts your exact price.";
  const checks =
    isDeep || (!isRental && freq[0] === "once")
      ? ["Supplies included", "Missed a spot? Text us and we\u2019ll make it right", "Book as soon as this week"]
      : ["No contracts. Pause or cancel anytime", "Same team every visit", "Book as soon as this week"];
  const priceChip = big
    ? summary
    : `${isDeep ? `Deep clean from ${price}` : isRental ? `From ${price} per turnover` : freq[0] === "once" ? `One-time from ${price}` : freq[0] === "biweekly" ? `From ${price} per clean` : `${freq[1]} from ${price}`} · ${bedTxt} · ${bathsLabel} bath`;

  const toPrice = () => {
    if (inArea) go(2);
    else setTried(1);
  };

  async function joinWait() {
    if (digits(s.waitPhone).length !== 10) return;
    const r = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zip: s.zip, phone: s.waitPhone }),
    }).catch(() => null);
    if (r?.ok) {
      // Its own event, so out-of-area signups don't count as leads in Meta.
      trackCustom("Waitlist", { zip: s.zip });
      set({ waitDone: true });
    }
  }

  async function submit() {
    if (!s.name.trim() || !phoneOk) return setTried(3);
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
          plan,
          priceShown: big ? "Exact price by text (5+ bedrooms)" : `${priceChip.split(" · ")[0]}`,
          offer: isDeep ? "Holiday deep clean" : "",
          name: s.name,
          phone: s.phone,
          source,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string };
      if (!res.ok || !json.ok) throw new Error();
      track("Lead", { plan, content_name: isDeep ? "Holiday deep clean quote" : isRental ? "Vacation rental quote" : "Home cleaning quote" });
      set({ leadId: json.id || "", opt: "open" });
      go(4);
    } catch {
      setSendErr("Something went wrong sending your request. Please try again, or text Kyle.");
    } finally {
      setSending(false);
    }
  }

  async function sendDetails() {
    const extras = EXTRAS.filter((e) => s.ex[e[0]]).map((e) => e[1]);
    const payload = {
      id: s.leadId,
      zip: s.zip,
      type: s.type,
      bedrooms: bedsLabel,
      bathrooms: bathsLabel,
      name: s.name,
      phone: s.phone,
      size: s.size,
      lastClean: s.last,
      extras,
      days: s.days.map((d) => (DAYS.find((x) => x[0] === d) || ["", "", d])[2]),
      timeOfDay: s.wins.map((w) => (WINS.find((x) => x[0] === w) || ["", w])[1]),
      address: s.addr,
      notes: s.notes,
    };
    const empty = !s.size && !s.last && !extras.length && !s.days.length && !s.wins.length && !s.addr.trim() && !s.notes.trim();
    if (empty) return set({ opt: "skipped" });
    setSending(true);
    setSendErr("");
    try {
      const res = await fetch("/api/quote/details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      track("CompleteRegistration", { content_name: "Quote details" });
      set({ opt: "sent" });
    } catch {
      setSendErr("Couldn't send your details. Please try again, or just text them to Kyle.");
    } finally {
      setSending(false);
    }
  }

  const exList = s.showAll ? EXTRAS : EXTRAS.slice(0, 4);

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
          {s.step <= 3 && (
            <div className="prog-wrap">
              <div className="progress" role="progressbar" aria-label="Quote progress" aria-valuemin={1} aria-valuemax={3} aria-valuenow={s.step}>
                {[1, 2, 3].map((n) => (
                  <div key={n} className={n <= s.step ? "seg on" : "seg"} />
                ))}
              </div>
              <div className="plabel">
                Step {s.step} of 3 · {STEP_NAMES[s.step - 1]}
              </div>
            </div>
          )}
        </div>
      </header>

      {isDeep && (
        <div className="adbar">
          <div className="wrap adbar-in">
            <Sparkle size={18} />
            <span>
              <b>Holiday deep clean</b> · Baseboards, vents, light switches, grout
            </span>
          </div>
        </div>
      )}

      <main className="main">
        {s.step === 1 && (
          <div className="card formc">
            {isDeep ? (
              <>
                <h1 className="qtitle" style={{ marginTop: 0 }}>
                  Get your home ready before the holidays
                </h1>
                <p className="sub">Room-by-room deep clean. See your price in 30 seconds, before we ask for your number.</p>
              </>
            ) : (
              <>
                <div className="kick">Free quote · About 30 seconds</div>
                <h1 className="qtitle">What are we cleaning?</h1>
                <p className="sub">Your starting price shows on the next screen. No phone number needed to see it.</p>
              </>
            )}
            <label className="field">
              <span className="lbl">ZIP code</span>
              <input
                className={tried === 1 && !zipOk ? "input bad" : "input"}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                placeholder="e.g. 32801"
                value={s.zip}
                aria-invalid={tried === 1 && !zipOk}
                onChange={(e) => set({ zip: e.target.value.replace(/\D/g, "").slice(0, 5), waitDone: false })}
              />
            </label>
            {inArea && (
              <div className="ok" role="status">
                <Ck box={22} />
                Good news, we clean in {cityFor(s.zip)}
              </div>
            )}
            <div className="field">
                <span className="lbl" id="ty">
                  Home or vacation rental?
                </span>
                <div className="types" role="group" aria-labelledby="ty">
                  <button type="button" className={isHome ? "opt sel" : "opt"} aria-pressed={isHome} onClick={() => set({ type: "home" })}>
                    {isHome && <Tick />}
                    <span className="opt-t">My home</span>
                  </button>
                  <button type="button" className={isRental ? "opt sel" : "opt"} aria-pressed={isRental} onClick={() => set({ type: "rental" })}>
                    {isRental && <Tick />}
                    <span className="opt-t">A vacation rental</span>
                    <span className="opt-s">Airbnb / VRBO</span>
                  </button>
                </div>
              </div>
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
                  <button type="button" aria-label="More bedrooms" disabled={big} onClick={() => set({ beds: Math.min(MAX_PRICED_BEDS + 1, s.beds + 1) })}>
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
              </div>
            </div>
            {err1 && (
              <div className="err" role="alert">
                {err1}
              </div>
            )}
            {zipOk && !inArea ? (
              <div className="nudge" role="status">
                <b>We&apos;re not in your area yet.</b> Leave your mobile number and we&apos;ll text you as soon as we are.
                {!s.waitDone ? (
                  <>
                    <label className="field" style={{ marginTop: 12 }}>
                      <span className="lbl">Mobile number</span>
                      <input
                        className="input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="(407) 555-0123"
                        value={s.waitPhone}
                        onChange={(e) => set({ waitPhone: fmtPhone(e.target.value) })}
                      />
                    </label>
                    <button type="button" className="btn" style={{ marginTop: 12 }} onClick={joinWait}>
                      Text me when you&apos;re here
                    </button>
                  </>
                ) : (
                  <div className="ok">You&apos;re on the list. We&apos;ll text you.</div>
                )}
              </div>
            ) : (
              <button type="button" className="btn" style={{ marginTop: 24 }} onClick={toPrice}>
                See my price
              </button>
            )}
          </div>
        )}

        {s.step === 2 && (
          <div className="card formc">
            <div className="chipline">
              <span>{summary}</span>
              <button type="button" className="linkbtn" aria-label="Edit your home details" onClick={() => go(1)}>
                Edit
              </button>
            </div>
            <h1 className="qtitle" style={{ marginTop: 18 }}>
              {priceHead}
            </h1>
            <div className="card pcard" aria-live="polite">
              <span className="badge">
                <Sparkle size={12} />
                {badge}
              </span>
              {big ? <span className="amt-txt">Exact price by text</span> : <span className="amt">{price}</span>}
              <span className="per">{per}</span>
            </div>
            <p className="muted" style={{ color: "#0E1F3D", fontWeight: 700, marginTop: 10 }}>
              For most homes, this is the price Kyle texts.
            </p>
            {!isDeep && !isRental && (
              <div className="field" style={{ marginTop: 18 }}>
                <span className="lbl" id="fq">
                  How often?
                </span>
                <div className="freqs" role="group" aria-labelledby="fq">
                  {FREQS.map((f) => (
                    <button key={f[0]} type="button" className={s.freq === f[0] ? "chip sel" : "chip"} aria-pressed={s.freq === f[0]} onClick={() => set({ freq: f[0] })}>
                      {f[1]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="muted">{mutedLine}</p>
            <ul className="checks">
              {checks.map((c) => (
                <li key={c}>
                  <Ck />
                  {c}
                </li>
              ))}
            </ul>
            <button type="button" className="btn" style={{ marginTop: 22 }} onClick={() => go(3)}>
              Text me my exact price
            </button>
            <div style={{ textAlign: "center", marginTop: 6 }}>
              <button type="button" className="linkbtn" onClick={() => go(1)}>
                Back
              </button>
            </div>
          </div>
        )}

        {s.step === 3 && (
          <div className="card formc">
            <div className="chipline">
              <span>{priceChip}</span>
              <button type="button" className="linkbtn" aria-label="See your price again" onClick={() => go(2)}>
                Back
              </button>
            </div>
            <h1 className="qtitle" style={{ marginTop: 18 }}>
              Where should Kyle text your exact price?
            </h1>
            <p className="sub">He checks your details and texts back, usually within 1 hour.</p>
            <label className="field">
              <span className="lbl">Your name</span>
              <input
                className={nameBad ? "input bad" : "input"}
                autoComplete="given-name"
                placeholder="First name is fine"
                value={s.name}
                aria-invalid={nameBad}
                aria-describedby={nameBad ? "ne" : undefined}
                onChange={(e) => set({ name: e.target.value })}
              />
            </label>
            {nameBad && (
              <div className="err" id="ne">
                Add your name so Kyle knows who he&apos;s texting.
              </div>
            )}
            <label className="field">
              <span className="lbl">Mobile number</span>
              <input
                className={phoneBad ? "input bad" : "input"}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(407) 555-0123"
                value={s.phone}
                aria-invalid={phoneBad}
                aria-describedby={phoneBad ? "ph pe" : "ph"}
                onChange={(e) => set({ phone: fmtPhone(e.target.value) })}
              />
              <span className="help" id="ph">
                We text, we don&apos;t call. No spam, ever.
              </span>
            </label>
            {phoneBad && (
              <div className="err" id="pe">
                Enter a 10-digit mobile number, like (407) 555-0123.
              </div>
            )}
            <div className="trust">
              <div className="kyle">
                <span className="av" role="img" aria-label="Photo of Kyle coming soon">
                  K
                </span>
                <span>Kyle, owner · Insured, background-checked team</span>
              </div>
              <blockquote className="quote">
                &ldquo;Scheduling was simple, the cleaners arrived right on time, and they did a wonderful job.&rdquo;
                <cite>Sarah Johnson, Orlando</cite>
              </blockquote>
            </div>
            <button type="button" className="btn" style={{ marginTop: 18 }} onClick={submit} disabled={sending}>
              {sending ? "Sending…" : "Text me my price"}
            </button>
            {sendErr && (
              <div className="err" role="alert">
                {sendErr}
              </div>
            )}
            <p className="fr">Free, no commitment.</p>
            <p className="alt">
              Rather just text? <a href={smsWithBody}>Text Kyle at {site.phoneDisplay}</a>
            </p>
          </div>
        )}

        {s.step === 4 && (
          <>
            <div className="card formc done">
              <svg viewBox="0 0 64 64" width="76" height="76" aria-hidden="true">
                <circle cx="32" cy="32" r="31" fill="#0E1F3D" />
                <path d="M17 29 32 18 47 29" fill="none" stroke="#C9A25E" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
                <path d="m24 37 6 6 11-12" fill="none" stroke="#C9A25E" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h1 className="qtitle" style={{ marginTop: 10 }}>
                Got it, {firstName}! Kyle will text you shortly.
              </h1>
              <p className="sub" style={{ marginTop: 6 }}>
                Texts come from <b style={{ color: "#0E1F3D" }}>{site.phoneDisplay}</b>.
              </p>
            </div>
            {s.opt === "open" ? (
              <section className="card opt-card" aria-labelledby="fast">
                <h2 className="qtitle" id="fast" style={{ fontSize: 28, margin: 0 }}>
                  Want your exact price faster?{" "}
                  <span style={{ fontFamily: "var(--font-dm), sans-serif", fontSize: 16, fontWeight: 500, color: "#5B6474" }}>(optional)</span>
                </h2>
                <p className="sub" style={{ marginTop: 4 }}>
                  Answer any of these and Kyle can skip the questions.
                </p>
                <label className="field">
                  <span className="lbl">Home size</span>
                  <select className="input" value={s.size} onChange={(e) => set({ size: e.target.value })}>
                    <option value="">Choose a size range</option>
                    {SIZES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field">
                  <span className="lbl" id="lc">
                    Last professional clean
                  </span>
                  <div className="chips" role="group" aria-labelledby="lc">
                    {LASTS.map((l) => (
                      <button key={l} type="button" className={s.last === l ? "chip sel" : "chip"} aria-pressed={s.last === l} onClick={() => set({ last: s.last === l ? "" : l })}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="lbl" id="ex">
                    Extras
                  </span>
                  <div className="extras" role="group" aria-labelledby="ex">
                    {exList.map((e) => (
                      <button
                        key={e[0]}
                        type="button"
                        className={s.ex[e[0]] ? "tile sel" : "tile"}
                        aria-pressed={!!s.ex[e[0]]}
                        onClick={() => set({ ex: { ...s.ex, [e[0]]: !s.ex[e[0]] } })}
                      >
                        {s.ex[e[0]] && <Tick />}
                        <span className="tn">{e[1]}</span>
                        <span className="opt-s">{e[2]}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="linkbtn" aria-expanded={s.showAll} onClick={() => set({ showAll: !s.showAll })}>
                    {s.showAll ? "Show fewer extras" : "See all extras"}
                  </button>
                </div>
                <div className="field" style={{ marginTop: 10 }}>
                  <span className="lbl" id="dy">
                    Best days
                  </span>
                  <div className="chips" role="group" aria-labelledby="dy">
                    {DAYS.map((d) => (
                      <button key={d[0]} type="button" className={s.days.includes(d[0]) ? "chip sel" : "chip"} aria-pressed={s.days.includes(d[0])} onClick={() => set({ days: toggleList(s.days, d[0]) })}>
                        {d[1]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="lbl" id="tm">
                    Time of day
                  </span>
                  <div className="chips" role="group" aria-labelledby="tm">
                    {WINS.map((w) => (
                      <button key={w[0]} type="button" className={s.wins.includes(w[0]) ? "chip sel" : "chip"} aria-pressed={s.wins.includes(w[0])} onClick={() => set({ wins: toggleList(s.wins, w[0]) })}>
                        {w[1]}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="field">
                  <span className="lbl">Street address</span>
                  <input className="input" autoComplete="street-address" placeholder="Include apt or gate code" value={s.addr} onChange={(e) => set({ addr: e.target.value })} />
                </label>
                <label className="field">
                  <span className="lbl">Anything we should know?</span>
                  <textarea className="input" placeholder="Pets, focus areas, how to get in" value={s.notes} onChange={(e) => set({ notes: e.target.value })} />
                </label>
                <button type="button" className="btn" style={{ marginTop: 22 }} onClick={sendDetails} disabled={sending}>
                  {sending ? "Sending…" : "Send details to Kyle"}
                </button>
                {sendErr && (
                  <div className="err" role="alert">
                    {sendErr}
                  </div>
                )}
                <div style={{ textAlign: "center", marginTop: 4 }}>
                  <button type="button" className="linkbtn" style={{ fontWeight: 500, color: "#5B6474" }} onClick={() => set({ opt: "skipped" })}>
                    Skip, I&apos;ll answer by text
                  </button>
                </div>
              </section>
            ) : (
              <div className="card opt-card thanks" role="status">
                <Ck size={17} box={32} />
                <span>{s.opt === "sent" ? "Thanks, Kyle has everything he needs." : "No problem. Kyle will ask by text."}</span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
