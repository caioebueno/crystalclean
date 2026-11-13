"use client";

/*
 * Landing page, ported 1:1 from the Claude Design file
 * (Crystal Clean Brand Identity canvas → "Page 1 · Landing").
 * Styles: src/app/lp.css. Text in [brackets] is a placeholder from the design.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { STORAGE_KEY, isInServiceArea, isZipValid, site, textUsHref, whatsappHref } from "@/config/site";

type HomeType = "" | "home" | "rental";

const HEADLINES = {
  "1": "Your exact cleaning price, by text. No calls, no guesswork.",
  "2": "Orlando home cleaning you don't have to double-check.",
  "3": "The same trusted team, every visit.",
};
const HEADLINE: keyof typeof HEADLINES = "1";

const ROOMS: [string, string[], string[]][] = [
  ["Kitchen", ["Counters, backsplash and sink", "Outside of appliances", "Stovetop wiped", "Floors vacuumed and mopped"], ["Inside microwave", "Cabinet fronts hand-wiped", "Grout and range hood degreased"]],
  ["Bathrooms", ["Toilet, tub and shower", "Mirrors and fixtures shined", "Counters and sink", "Floors mopped"], ["Soap scum and grout detailed", "Cabinet fronts and baseboards"]],
  ["Bedrooms", ["Dusting of reachable surfaces", "Beds made", "Mirrors and glass", "Floors vacuumed"], ["Baseboards and door frames", "Ceiling fans and vents", "Under furniture where reachable"]],
  ["Living areas", ["Dusting and surfaces", "Glass and mirrors", "Trash emptied", "Floors vacuumed and mopped"], ["Light switches and handles", "Window sills and tracks", "Lamps and decor detailed"]],
];

const FAQS: [string, string][] = [
  ["Why don't you show prices online?", "Every home is different, so we give you an exact price instead of a guess."],
  ["What if something was missed?", "Text us and we'll make it right."],
  ["Do I need to be home?", "No. Many clients give us a door code or leave a key. Add entry notes when you request your quote."],
  ["Do you bring supplies?", "Yes, we bring everything. If you prefer your own products, just tell us."],
  ["What plans do you offer?", "One-time cleans, or recurring plans every week, every 2 weeks or every month."],
  ["Will I get the same team?", "Yes. On a recurring plan, the same team cleans your home every visit."],
  ["How do vacation rental turnovers work?", "We sync to your booking calendar, clean between checkout and check-in on the same day, restock linens and supplies, check for damage and send you a photo report."],
];

const CMP = [
  "Exact price before you book",
  "No in-home estimate needed",
  "Same team every visit",
  "Text instead of phone tag",
  "Photo reports for rentals",
  "Room-by-room checklist",
  "Owner-run and local",
];

/* ---------- icons (from the design) ---------- */
const sv = { fill: "none", stroke: "#0E1F3D", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const Bubble = ({ size = 28, w = 1.5, dash = true }: { size?: number; w?: number; dash?: boolean }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...sv} strokeWidth={w} aria-hidden="true">
    <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.3-4A8 8 0 1 1 20 12z" />
    {dash && <path d="M9 12h6" />}
  </svg>
);
const IcoPlans = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
    <rect x="5" y="3.5" width="14" height="17" rx="2" />
    <path d="M9 8h6M9 12h6" />
    <path d="M4 20 20 4" />
  </svg>
);
const IcoTeam = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" />
    <circle cx="17" cy="9.5" r="2.8" />
    <path d="M2.5 20c.8-3.4 3.3-5.3 6.5-5.3s5.7 1.9 6.5 5.3" />
    <path d="M15.5 14.5c2.6.1 4.6 1.8 5.3 4.5" />
  </svg>
);
const IcoCam = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
const IcoShield = ({ size = 28, w = 1.5, color = "#0E1F3D" }: { size?: number; w?: number; color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...sv} stroke={color} strokeWidth={w} aria-hidden="true">
    <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" />
  </svg>
);
const IcoHome = ({ size = 28, w = 1.5, dot = false }: { size?: number; w?: number; dot?: boolean }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...sv} strokeWidth={w} aria-hidden="true">
    <path d="M3 11 12 4l9 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    {dot && <circle cx="12" cy="13.5" r="2.2" />}
  </svg>
);
const IcoKey = ({ size = 28, w = 1.5 }: { size?: number; w?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...sv} strokeWidth={w} aria-hidden="true">
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.7 12.3 20 3" />
    <path d="m16 7 3 3" />
    <path d="m18.5 4.5 2 2" />
  </svg>
);
const Ck = () => (
  <span className="ck" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#0E1F3D" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
  </span>
);
const Roofline = ({ width, height, stroke }: { width: number; height: number; stroke: number }) => (
  <svg viewBox="0 0 560 70" width={width} height={height} aria-hidden="true">
    <path d="M4 64H190L280 10L370 64H556" fill="none" stroke="#C9A25E" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
    <path d="M322 6q0 10 10 10q-10 0-10 10q0-10-10-10q10 0 10-10Z" fill="#C9A25E" />
  </svg>
);

function Cta({ center = false, href = "#start", label = "Get my free quote", onClick, style }: { center?: boolean; href?: string; label?: string; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <div className={center ? "cta c" : "cta"} style={style}>
      <a className="btn btn-lg" href={href} onClick={onClick}>
        {label}
      </a>
      <span className="fr">Free quote · No commitment to book</span>
      <span className="gline">
        <Ck />
        Exact price by text · Flexible plans
      </span>
    </div>
  );
}

function loadSaved(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

/**
 * PLACEHOLDER REVIEWS FOR THE MOCKUP ONLY. These are not real customers.
 * Before any public launch, replace them with real reviews, word for word, or remove them:
 * publishing made-up reviews is illegal (FTC rule on fake reviews).
 */
const EXAMPLE_REVIEWS = [
  {
    who: "Jessica M.",
    city: "Winter Park",
    service: "Recurring cleaning",
    text: "Same team every visit, and they remembered exactly how we like the kitchen and the kids' bathroom. Coming home on cleaning day is the best part of the week.",
  },
  {
    who: "Daniel R.",
    city: "Lake Nona",
    service: "Deep clean",
    text: "Baseboards, ceiling fans, inside the oven. They got to all the spots we'd been ignoring for months, and the house smelled fresh without being overpowering.",
  },
  {
    who: "Amanda T.",
    city: "Kissimmee",
    service: "Vacation rental turnover",
    text: "Back-to-back check-ins are easy now. Beds made, towels staged, and a photo of every room sent by text so I know it's guest-ready.",
  },
];

export default function Landing() {
  const [zip, setZip] = useState("");
  const [type, setType] = useState<HomeType>("");
  const [faq, setFaq] = useState(0);
  const [inc, setInc] = useState<"standard" | "deep">("standard");
  const [heroVisible, setHeroVisible] = useState(true);
  const [areaZip, setAreaZip] = useState("");
  const [areaRes, setAreaRes] = useState<"" | "in" | "out" | "short">("");
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const st = loadSaved();
    if (typeof st.zip === "string") setZip(st.zip);
    if (st.type === "home" || st.type === "rental") setType(st.type);
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => setHeroVisible(es[0].isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Carry ZIP + home type over to the quote page. */
  const handOff = (extra?: { zip?: string; type?: HomeType }) => {
    try {
      const cur = loadSaved();
      const base = cur.step === 6 ? {} : cur;
      const nx = { ...base, zip, type, step: 1, editStart: false, ...(extra || {}) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nx));
    } catch {
      /* storage unavailable: the query string still carries the answers */
    }
  };
  const quoteHref = (z = zip, t: HomeType = type) => {
    const p = new URLSearchParams();
    if (z) p.set("zip", z);
    if (t) p.set("type", t);
    const q = p.toString();
    return q ? `/quote?${q}` : "/quote";
  };

  const isHome = type === "home";
  const isRental = type === "rental";
  const onZip = (e: React.ChangeEvent<HTMLInputElement>) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
  const startQuote = () => handOff();
  const startRental = () => {
    handOff({ type: "rental" });
    setType("rental");
  };
  const checkArea = () => setAreaRes(isZipValid(areaZip) ? (isInServiceArea(areaZip) ? "in" : "out") : "short");
  const areaGo = () => {
    setZip(areaZip);
    handOff({ zip: areaZip });
  };

  const typeButtons = (withIcons: boolean) => (
    <div className="types">
      <button type="button" className={isHome ? "opt sel" : "opt"} aria-pressed={isHome} onClick={() => setType("home")}>
        {withIcons && <IcoHome w={1.6} />}
        <span className="opt-t">My home</span>
      </button>
      <button type="button" className={isRental ? "opt sel" : "opt"} aria-pressed={isRental} onClick={() => setType("rental")}>
        {withIcons && <IcoKey w={1.6} />}
        <span className="opt-t">A vacation rental</span>
        <span className="opt-s">Airbnb / VRBO</span>
      </button>
    </div>
  );

  return (
    <div className="lp" id="top">
      <div className="topbar">
        Free quote · <b>Exact price by text</b> · Flexible plans
      </div>
      <header className="hdr">
        <div className="wrap hdr-in">
          <a href="#top" className="logo" aria-label="Crystal Clean, back to top">
            <Roofline width={130} height={16} stroke={5} />
            <span className="logo-word">Crystal Clean</span>
          </a>
          <div className="hdr-r">
            <a className="txt-link" href={textUsHref}>
              <Bubble size={20} w={1.7} dash={false} />
              <span className="tl-l">Text us</span>
            </a>
            <a className="btn btn-sm" href="#start">
              Get my free quote
            </a>
          </div>
        </div>
      </header>

      <section className="hero" ref={heroRef} aria-labelledby="hero-h">
        <div className="hero-img" aria-hidden="true" />
        <div className="hero-veil" aria-hidden="true" />
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">Orlando home &amp; vacation rental cleaning</p>
            <h1 className="h1" id="hero-h">
              {HEADLINES[HEADLINE]}
            </h1>
            <p className="lede">
              Your exact price by text, flexible plans and the same trusted team every visit, for Orlando homes and vacation rentals.
            </p>
            <div className="lead-pill">
              <span className="gcirc">
                <svg viewBox="0 0 24 24" width="24" height="24" {...sv} strokeWidth={1.9} aria-hidden="true">
                  <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.3-4A8 8 0 1 1 20 12z" />
                  <path d="M9 12h6" />
                </svg>
              </span>
              <span>
                An exact price for your home, by text.
                <br />
                <span style={{ fontWeight: 500, color: "#5B6474" }}>No in-home estimate. No phone tag.</span>
              </span>
            </div>
          </div>
          <div className="card qcard" id="start">
            <div className="qcard-h">Start your free quote</div>
            <label className="field">
              <span className="lbl">What&apos;s your ZIP code?</span>
              <input className="input" inputMode="numeric" autoComplete="postal-code" placeholder="e.g. 32801" value={zip} onChange={onZip} />
            </label>
            <div className="field">
              <span className="lbl">What are we cleaning?</span>
              {typeButtons(true)}
            </div>
            <a className="btn btn-block btn-lg" style={{ marginTop: 20 }} href={quoteHref()} onClick={startQuote}>
              Start my free quote
            </a>
            <div className="fr" style={{ textAlign: "center", marginTop: 8 }}>
              Free · No commitment · Takes about 2 minutes
            </div>
            <div className="trust">
              <span>
                <svg viewBox="0 0 24 24" width="16" height="16" {...sv} stroke="#5B6474" strokeWidth={1.8} aria-hidden="true">
                  <circle cx="7" cy="9" r="1.6" />
                  <circle cx="11" cy="6" r="1.6" />
                  <circle cx="15.5" cy="7" r="1.6" />
                  <circle cx="18" cy="11" r="1.6" />
                  <path d="M8.5 17.5c0-2.8 2-5 4.3-5s4.2 2.2 4.2 4.5c0 1.8-1.4 2.5-2.9 2.1-1-.3-1.8-.3-2.8 0-1.6.5-2.8-.1-2.8-1.6z" />
                </svg>
                Pet-friendly
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="sp-bar" aria-label="Why customers choose us">
        <div className="wrap sp-grid">
          <div className="sp">
            <div className="icn">
              <Bubble />
            </div>
            Exact price by text
          </div>
          <div className="sp">
            <div className="icn">
              <IcoPlans />
            </div>
            Flexible plans
          </div>
          <div className="sp">
            <div className="icn">
              <IcoTeam />
            </div>
            Same team every visit
          </div>
          <div className="sp">
            <div className="icn">
              <IcoCam />
            </div>
            Photo reports for rentals
          </div>
        </div>
      </section>

      <section className="sec" id="why" aria-labelledby="why-h">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">Why Crystal Clean</p>
            <h2 className="h2" id="why-h">
              Cleaning you don&apos;t have to double-check
            </h2>
            <p className="lede">Most Orlando cleaners make you call, wait for an in-home estimate or guess at a price range. We do it differently.</p>
          </div>
          <div className="why-grid">
            <div className="card why lead">
              <div className="icn">
                <Bubble />
              </div>
              <h3 className="h3">Know your exact price before you book</h3>
              <p>Based on your actual home, sent by text. No estimate visit, no phone tag, no commitment.</p>
            </div>
            <div className="card why">
              <div className="icn">
                <IcoPlans />
              </div>
              <h3 className="h3">Pick the plan that fits your life</h3>
              <p>
                One-time, weekly, every 2 weeks or monthly.
              </p>
            </div>
            <div className="card why">
              <div className="icn">
                <IcoTeam />
              </div>
              <h3 className="h3">Come home to the same trusted team</h3>
              <p>People you get to know, who learn how you like your home.</p>
            </div>
            <div className="card why">
              <div className="icn">
                <IcoShield />
              </div>
              <h3 className="h3">Relax, your home is in careful hands</h3>
              <p>
                Pet-friendly · Supplies included
              </p>
            </div>
            <div className="card why">
              <div className="icn">
                <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
                  <rect x="5" y="3.5" width="14" height="17" rx="2" />
                  <path d="m8.5 9 1.5 1.5 3-3M8.5 15l1.5 1.5 3-3" />
                </svg>
              </div>
              <h3 className="h3">See exactly what you&apos;re getting</h3>
              <p>A room-by-room checklist for every Standard and Deep clean. Nothing hidden.</p>
            </div>
            <div className="card why">
              <div className="icn">
                <IcoHome dot />
              </div>
              <h3 className="h3">Deal with the people who run it</h3>
              <p>
                Owner-run in Orlando. We check in on every home we clean.
              </p>
            </div>
          </div>
          <div className="lang">
            <svg viewBox="0 0 24 24" width="22" height="22" {...sv} stroke="#7A5D27" strokeWidth={1.7} aria-hidden="true">
              <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.3-4A8 8 0 1 1 20 12z" />
            </svg>
            <span>
              Text or{" "}
              <a href={whatsappHref} target="_blank" rel="noopener" style={{ color: "inherit", fontWeight: 700 }}>
                WhatsApp
              </a>{" "}
              us in English, Português or Español.
            </span>
          </div>
          <Cta center style={{ marginTop: 30 }} />
        </div>
      </section>

      <section className="sec sec-w" id="compare" aria-labelledby="cmp-h">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">Compare</p>
            <h2 className="h2" id="cmp-h">
              Crystal Clean vs. the typical cleaning company
            </h2>
          </div>
          <div className="card cmp">
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr">Feature</span>
                  </th>
                  <th scope="col" className="us">
                    Crystal Clean
                  </th>
                  <th scope="col">Typical company</th>
                </tr>
              </thead>
              <tbody>
                {CMP.map((label) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="us">
                      <span className="mark yes">
                        <svg viewBox="0 0 24 24" width="18" height="18" {...sv} strokeWidth={3} aria-hidden="true">
                          <path d="m5 12 5 5 9-10" />
                        </svg>
                      </span>
                      <span className="sr">Yes</span>
                    </td>
                    <td>
                      <span className="mark no">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5B6474" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </span>
                      <span className="sr">Usually not</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Cta center style={{ marginTop: 30 }} />
        </div>
      </section>

      <section className="sec" id="how" aria-labelledby="how-h">
        <div className="wrap center">
          <p className="eyebrow">How it works</p>
          <h2 className="h2" id="how-h">
            Three steps. No phone tag.
          </h2>
          <div className="steps3" style={{ textAlign: "left" }}>
            {[
              ["Tell us about your home", "A few taps, about 2 minutes. No phone call, no in-home visit."],
              ["Get your exact price by text", "An exact price for your home, not a range or a guess."],
              ["Reply YES to book", "The same team takes care of your home every visit."],
            ].map(([t, d], i) => (
              <div className="card stepc" key={t}>
                <div className="num">{i + 1}</div>
                <h3 className="h3">{t}</h3>
                <p style={{ margin: "8px 0 0", color: "#5B6474" }}>{d}</p>
              </div>
            ))}
          </div>
          <Cta center style={{ marginTop: 36 }} />
        </div>
      </section>

      <section className="sec dark" id="owner" aria-labelledby="own-h">
        <div className="wrap own-grid">
          <div className="own-photo has-img" role="img" aria-label="A gloved hand wiping a bright bathroom counter" />
          <div>
            <p className="eyebrow">Owner-run, right here in Orlando</p>
            <h2 className="h2" id="own-h">
              Not a franchise. A local business that answers to you.
            </h2>
            <p className="note">
              &ldquo;
              <span className="ph">
                [Crystal Clean started here in Orlando because finding a cleaner you can trust shouldn&apos;t take weeks of calls and estimates. We&apos;re
                owner-run, so every home gets personal attention, and every message is read by someone who cares how your home looks. When you invite us
                in, we treat your home the way we&apos;d want ours treated.]
              </span>
              &rdquo;
            </p>
            <div className="sign">Crystal Clean</div>
            <div className="sign-s">Owner-run in Orlando</div>
            <Cta style={{ marginTop: 28 }} />
          </div>
        </div>
      </section>

      <section className="sec sec-w" id="hosts" aria-labelledby="h-h">
        <div className="wrap host-grid">
          <div>
            <p className="eyebrow">For Airbnb &amp; VRBO hosts</p>
            <h2 className="h2" id="h-h">
              Turnovers you can see, without lifting a finger
            </h2>
            <p className="lede">For owners and property managers near the parks. We sync to your calendar, clean between guests and send you the photos.</p>
            <ul className="hlist">
              <li>
                <div className="icn">
                  <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>
                <div>
                  <b>Same-day turnovers</b>
                  <div style={{ color: "#5B6474" }}>Checkout to check-in, handled on the same day.</div>
                </div>
              </li>
              <li>
                <div className="icn">
                  <IcoCam />
                </div>
                <div>
                  <b>A photo report after every turnover</b>
                  <div style={{ color: "#5B6474" }}>Every room, sent to your phone before your guests arrive.</div>
                </div>
              </li>
              <li>
                <div className="icn">
                  <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                    <path d="M3.5 10h17M8 3v4M16 3v4" />
                  </svg>
                </div>
                <div>
                  <b>Synced to your booking calendar</b>
                  <div style={{ color: "#5B6474" }}>New Airbnb and VRBO bookings land on our schedule automatically.</div>
                </div>
              </li>
              <li>
                <div className="icn">
                  <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
                    <path d="M4 7h16v3.5H4zM4 13.5h16V17H4zM6 20h12" />
                  </svg>
                </div>
                <div>
                  <b>Linen and guest supplies restocked</b>
                  <div style={{ color: "#5B6474" }}>Hotel-style beds, towels staged, basics topped up.</div>
                </div>
              </li>
              <li>
                <div className="icn">
                  <IcoShield />
                </div>
                <div>
                  <b>Damage and inventory checks</b>
                  <div style={{ color: "#5B6474" }}>Clear photo evidence if you ever need to file a claim.</div>
                </div>
              </li>
            </ul>
            <Cta href={quoteHref(zip, "rental")} label="Get my turnover quote" onClick={startRental} />
          </div>
          <div className="phone" role="img" aria-label="Example turnover photo report on a phone">
            <div className="screen">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-vibes), cursive", fontSize: 22 }}>Crystal Clean</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1E6B45" }}>● Complete</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>Turnover report</div>
              <div style={{ fontSize: 12, color: "#5B6474" }}>Vacation rental · Today 2:41 pm</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 12 }}>
                <div className="th th-k">
                  <span>Kitchen ✓</span>
                </div>
                <div className="th th-b">
                  <span>Primary bed ✓</span>
                </div>
                <div className="th th-ba">
                  <span>Bath 1 ✓</span>
                </div>
                <div className="th th-p">
                  <span>Pool deck ✓</span>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  ["Damage found", "None"],
                  ["Linens", "4 beds changed"],
                  ["Restocked", "Towels, coffee, soap"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #EEE8DE", paddingBottom: 5 }}>
                    <span>{k}</span>
                    <b>{v}</b>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Next check-in</span>
                  <b>Today 4:00 pm</b>
                </div>
              </div>
              <div style={{ marginTop: 12, background: "#0E1F3D", color: "#fff", borderRadius: 10, padding: 9, textAlign: "center", fontSize: 12, fontWeight: 700 }}>
                View all 38 photos
              </div>
              <div style={{ fontSize: 11, color: "#5B6474", textAlign: "center", marginTop: 6 }}>Sample report, for illustration</div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="included" aria-labelledby="inc-h">
        <div className="wrap center">
          <p className="eyebrow">What&apos;s included</p>
          <h2 className="h2" id="inc-h">
            Nothing hidden, room by room
          </h2>
          <div className="seg2" role="group" aria-label="Clean type">
            <button type="button" className={inc === "standard" ? "on" : ""} aria-pressed={inc === "standard"} onClick={() => setInc("standard")}>
              Standard clean
            </button>
            <button type="button" className={inc === "deep" ? "on" : ""} aria-pressed={inc === "deep"} onClick={() => setInc("deep")}>
              Deep clean
            </button>
          </div>
          <div className="inc-grid" style={{ textAlign: "left" }}>
            {ROOMS.map(([name, std, deep]) => (
              <div className="card inc" key={name}>
                <h3 className="h3">{name}</h3>
                <ul>
                  {std.map((t) => (
                    <li key={t}>
                      <Ck />
                      <span>{t}</span>
                    </li>
                  ))}
                  {inc === "deep" &&
                    deep.map((t) => (
                      <li key={t} className="deep">
                        <Ck />
                        <span>{t}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          {inc === "deep" && (
            <p className="help" style={{ marginTop: 14 }}>
              Bold items are added in a deep clean.
            </p>
          )}
          <Cta center style={{ marginTop: 30 }} />
        </div>
      </section>

      <section className="sec sec-w" id="services" aria-labelledby="svc-h">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">Services</p>
            <h2 className="h2" id="svc-h">
              Everything your home needs
            </h2>
          </div>
          <div className="svc-grid">
            <div className="card svc">
              <div className="icn">
                <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
                  <path d="M20 12a8 8 0 0 1-13.7 5.6" />
                  <path d="M4 12a8 8 0 0 1 13.7-5.6" />
                  <path d="M17.7 2.8v3.8h-3.8" />
                  <path d="M6.3 21.2v-3.8h3.8" />
                </svg>
              </div>
              <h3 className="h3">Recurring cleaning</h3>
              <ul>
                <li>Kitchen, bathrooms, floors and dusting</li>
                <li>Same team, same checklist every visit</li>
                <li>Weekly, every 2 weeks or monthly</li>
              </ul>
              <a href="#start">Get my free quote</a>
            </div>
            <div className="card svc">
              <div className="icn">
                <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
                  <path d="M6 4h12l4 5-10 12L2 9z" />
                  <path d="M2 9h20" />
                  <path d="M9 4 7.5 9 12 21l4.5-12L15 4" />
                </svg>
              </div>
              <h3 className="h3">Deep cleaning</h3>
              <ul>
                <li>Baseboards, doors, vents and switches</li>
                <li>Built-up grime in kitchen and baths</li>
                <li>The reset most homes need first</li>
              </ul>
              <a href="#start">Get my free quote</a>
            </div>
            <div className="card svc">
              <div className="icn">
                <svg viewBox="0 0 24 24" width="28" height="28" {...sv} strokeWidth={1.5} aria-hidden="true">
                  <path d="M13 21H5V3h8" />
                  <path d="M13 3v4M13 17v4M10 12h11" />
                  <path d="m17.5 8.5 3.5 3.5-3.5 3.5" />
                </svg>
              </div>
              <h3 className="h3">Move-in / move-out</h3>
              <ul>
                <li>Inside cabinets, closets and appliances</li>
                <li>Empty-home detail for deposits</li>
                <li>Ready for keys on move day</li>
              </ul>
              <a href="#start">Get my free quote</a>
            </div>
            <div className="card svc">
              <div className="icn">
                <IcoKey />
              </div>
              <h3 className="h3">Vacation rental turnovers</h3>
              <ul>
                <li>Hotel-style beds and staged towels</li>
                <li>Photo report after every turnover</li>
                <li>Synced to your booking calendar</li>
              </ul>
              <a href={quoteHref(zip, "rental")} onClick={startRental}>
                Get my free quote
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="reviews" aria-labelledby="rev-h">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">Reviews</p>
            <h2 className="h2" id="rev-h">
              What our clients say
            </h2>
          </div>
          <div className="rev-grid">
            {EXAMPLE_REVIEWS.map((r) => (
              <figure className="card rev rev-real" key={r.who} style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span style={{ color: "#7A5D27", fontWeight: 700, fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>{r.service}</span>
                  <span aria-hidden="true" style={{ color: "#B8924A", letterSpacing: 2 }}>
                    ★★★★★
                  </span>
                </div>
                <blockquote style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 22, margin: "10px 0" }}>&ldquo;{r.text}&rdquo;</blockquote>
                <figcaption style={{ fontSize: 15, color: "#5B6474" }}>
                  <strong style={{ color: "#0E1F3D" }}>{r.who}</strong> · {r.city}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="founding">
            <div>
              <div className="h3">Be one of our first Orlando customers.</div>
              <p style={{ margin: "6px 0 0", color: "#5B6474" }}>An exact price by text, flexible plans and the same team every visit.</p>
            </div>
            <div className="cta">
              <a className="btn btn-lg" href="#start">
                Get my free quote
              </a>
              <span className="fr">Free quote · No commitment to book</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-w" id="area" aria-labelledby="area-h">
        <div className="wrap area-grid">
          <div>
            <p className="eyebrow">Service area</p>
            <h2 className="h2" id="area-h">
              Cleaning homes across the Orlando area
            </h2>
            <div className="cities">
              {site.cities.map((c) => (
                <span className="city" key={c}>
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 26, background: "#F4F2EE", boxShadow: "none" }}>
            <div className="h3">Do we clean in your area?</div>
            <label className="field" htmlFor="areaZip">
              <span className="lbl">Your ZIP code</span>
            </label>
            <div className="zipcheck">
              <input
                id="areaZip"
                className="input"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="e.g. 32789"
                value={areaZip}
                onChange={(e) => {
                  setAreaZip(e.target.value.replace(/\D/g, "").slice(0, 5));
                  setAreaRes("");
                }}
              />
              <button type="button" className="btn" onClick={checkArea}>
                Check
              </button>
            </div>
            {areaRes === "in" && (
              <>
                <div className="ok">Yes, we clean in {areaZip}.</div>
                <a className="btn btn-block" style={{ marginTop: 12 }} href={quoteHref(areaZip)} onClick={areaGo}>
                  Get my free quote
                </a>
                <div className="fr" style={{ textAlign: "center", marginTop: 6 }}>
                  Free quote · No commitment to book
                </div>
              </>
            )}
            {areaRes === "out" && (
              <>
                <div className="err">We&apos;re not in {areaZip} yet.</div>
                <a className="btn btn-block" style={{ marginTop: 12 }} href={quoteHref(areaZip)} onClick={areaGo}>
                  Join the waitlist
                </a>
              </>
            )}
            {areaRes === "short" && <div className="err">Please enter a 5-digit ZIP code.</div>}
          </div>
        </div>
      </section>

      <section className="sec" id="faq" aria-labelledby="faq-h">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">FAQ</p>
            <h2 className="h2" id="faq-h">
              Quick answers
            </h2>
          </div>
          <div className="faq">
            {FAQS.map(([q, a], i) => (
              <div className="faq-item" key={q}>
                <button type="button" className="faq-q" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}>
                  <span>{q}</span>
                  <span aria-hidden="true" style={{ fontSize: 24, color: "#7A5D27" }}>
                    {faq === i ? "−" : "+"}
                  </span>
                </button>
                {faq === i && <div className="faq-a">{a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec dark" aria-labelledby="final-h">
        <div className="wrap final-grid">
          <div>
            <Roofline width={220} height={28} stroke={4} />
            <h2 className="h2" id="final-h" style={{ marginTop: 16 }}>
              Ready for a crystal clear home?
            </h2>
            <p className="lede">Tell us about your home and we&apos;ll text you an exact price. No calls, no guesswork.</p>
            <div className="gline" style={{ marginTop: 18 }}>
              <Ck />
              Exact price by text · Flexible plans
            </div>
          </div>
          <div className="card qcard">
            <div className="qcard-h">Start your free quote</div>
            <label className="field">
              <span className="lbl">What&apos;s your ZIP code?</span>
              <input className="input" inputMode="numeric" autoComplete="postal-code" placeholder="e.g. 32801" value={zip} onChange={onZip} />
            </label>
            <div className="field">
              <span className="lbl">What are we cleaning?</span>
              {typeButtons(false)}
            </div>
            <a className="btn btn-block btn-lg" style={{ marginTop: 20 }} href={quoteHref()} onClick={startQuote}>
              Start my free quote
            </a>
            <div className="fr" style={{ textAlign: "center", marginTop: 8 }}>
              Free quote · No commitment to book
            </div>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <Roofline width={200} height={25} stroke={3.4} />
              <div style={{ fontFamily: "var(--font-vibes), cursive", fontSize: 44, lineHeight: 1 }}>Crystal Clean</div>
              <div style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 14, fontWeight: 700, letterSpacing: ".32em" }}>HOME CLEANING · ORLANDO</div>
            </div>
            <div>
              <b>Service area</b>
              <div style={{ color: "#5B6474", marginTop: 6 }}>
                Orlando, Kissimmee, Four Corners, Clermont, Davenport, Winter Park and nearby towns
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
              <b>Contact</b>
              <a href={textUsHref}>Text us {site.phoneDisplay}</a>
              <a href="https://instagram.com/crystalclean.fl" target="_blank" rel="noopener">
                Instagram @crystalclean.fl
              </a>
            </div>
          </div>
          <div className="foot-small">
            <span>© 2026 Crystal Clean. All rights reserved.</span>
            <span>
              <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
            </span>
          </div>
        </div>
      </footer>

      {!heroVisible && (
        <div className="mcta">
          <a className="btn btn-lg btn-block" href={quoteHref()} onClick={startQuote}>
            Get my free quote
          </a>
        </div>
      )}
    </div>
  );
}
