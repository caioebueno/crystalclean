"use client";

/**
 * The customer booking page (/book/[code]), ported from website-design/book.html.
 * Also used as the live preview inside the admin "Create booking link" screen (preview mode).
 */
import { useEffect, useRef, useState } from "react";
import { textUsHref } from "@/config/site";
import { addrLine, bathsLabel, dateLabel, digits, extraDesc, extraName, fmtPhone, freqOf, money, winLabels, winTimes, type PublicLink } from "@/lib/booking";
import { Roofline } from "@/components/brand";
import "./bp.css";

type Confirm = (code: string, optionId: string, phone: string, textMe: boolean) => Promise<{ ok: boolean; error?: string; link?: PublicLink }>;

const ROOMS: [string, string, string[]][] = [
  ["kitchen", "Kitchen", ["Counters, backsplash and sink", "Outside of appliances", "Stovetop wiped", "Floors vacuumed and mopped"]],
  ["bath", "Bathrooms", ["Toilet, tub and shower", "Mirrors and fixtures shined", "Counters and sink", "Floors mopped"]],
  ["bed", "Bedrooms", ["Dusting of reachable surfaces", "Beds made", "Mirrors and glass", "Floors vacuumed"]],
  ["living", "Living areas", ["Dusting and surfaces", "Glass and mirrors", "Trash emptied", "Floors vacuumed and mopped"]],
];

const S = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const Chat = ({ size = 20, stroke = "#0E1F3D", w = 1.7 }: { size?: number; stroke?: string; w?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...S} stroke={stroke} strokeWidth={w} aria-hidden="true">
    <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.3-4A8 8 0 1 1 20 12z" />
  </svg>
);
const Check = ({ size = 13, w = 3.4 }: { size?: number; w?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...S} stroke="#0E1F3D" strokeWidth={w} aria-hidden="true">
    <path d="m5 12 5 5 9-10" />
  </svg>
);
const CalIcon = ({ size = 20, stroke = "#0E1F3D", w = 1.9 }: { size?: number; stroke?: string; w?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...S} stroke={stroke} strokeWidth={w} aria-hidden="true">
    <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
  </svg>
);

export function BookView({ link, preview = false, confirm, onView }: { link: PublicLink; preview?: boolean; confirm?: Confirm; onView?: (code: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ kitchen: true });
  const [textMe, setTextMe] = useState(true);
  const [phoneEdit, setPhoneEdit] = useState(false);
  const [phone, setPhone] = useState(link.cust.phone ? fmtPhone(link.cust.phone) : "");
  const [calOpen, setCalOpen] = useState(false);
  const [picked, setPicked] = useState(link.status === "booked" ? link.picked ?? "" : "");
  const [done, setDone] = useState(link.status === "booked");
  const [already] = useState(link.status === "booked");
  const [status, setStatus] = useState(link.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setMobile(el.clientWidth < 760);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!preview && onView && link.status === "sent") onView(link.id);
  }, [preview, onView, link.id, link.status]);

  // Keep the preview in step with the form (phone typed in admin).
  useEffect(() => {
    if (preview) setPhone(link.cust.phone ? fmtPhone(link.cust.phone) : "");
  }, [preview, link.cust.phone]);

  const c = link.cust;
  const first = (c.name || "").trim().split(" ")[0] || "there";
  const sentBy = (link.sentBy || "").trim() || "Crystal Clean";
  const { short: winShort, long: winLong } = winLabels(link);
  const [ws, we] = winTimes(link);
  const dateLong = dateLabel(link.date, { weekday: "long", month: "long", day: "numeric" });
  const dateShort = dateLabel(link.date, { weekday: "long", month: "short", day: "numeric" });
  const dateTiny = `${dateLabel(link.date, { weekday: "short", month: "short", day: "numeric" })} · ${winShort}`;
  const options = link.options;
  const single = options.length === 1;
  const pickedId = single ? options[0]?.id : picked;
  const sel = options.find((o) => o.id === pickedId);
  const descFor = (o: (typeof options)[number]) =>
    o.type === "plan" ? `Your first clean on ${dateShort}, then ${freqOf(o.freq)[1].toLowerCase()} with the same team.` : `A single clean on ${dateShort}.`;
  const selText = sel ? `${sel.name} · ${money(sel.price)}${sel.type === "plan" ? " per clean" : ""}` : "Choose an option above";
  const ex = (c.extras || []).map((k) => ({ name: extraName(k), desc: extraDesc(k) }));
  const enc = encodeURIComponent;
  const smsBody = (t: string) => `${textUsHref}?&body=${enc(t)}`;
  const addr = addrLine(c);
  const isoT = (t: string) => `${(link.date || "").replace(/-/g, "")}T${(t || "00:00").replace(":", "")}00`;
  const title = "Crystal Clean home cleaning";
  const details = `${sel ? sel.name + ". " : ""}Arrival window ${winShort}. Questions? Text us.`;
  const fullAddr = [c.addr, c.zip && !c.addr.includes(c.zip) ? c.zip : ""].filter(Boolean).join(", ");
  const phoneOk = digits(phone).length >= 10;
  const needPhone = !phoneOk || phoneEdit;
  const cantConfirm = !sel || !phoneOk || busy;
  const showMain = !done && status !== "expired" && status !== "cancelled";

  async function onConfirm() {
    if (!sel || !phoneOk) return;
    setErr("");
    if (preview || !confirm) {
      setDone(true);
      return;
    }
    setBusy(true);
    try {
      const r = await confirm(link.id, sel.id, phone, textMe);
      if (r.ok) {
        setDone(true);
        setPhoneEdit(false);
        rootRef.current?.scrollIntoView();
      } else {
        if (r.link && (r.link.status === "expired" || r.link.status === "cancelled")) setStatus(r.link.status);
        setErr(r.error || "Something went wrong. Please try again or text us.");
      }
    } catch {
      setErr("Something went wrong. Please try again or text us.");
    } finally {
      setBusy(false);
    }
  }

  function icsDownload() {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Crystal Clean//Booking//EN",
      "BEGIN:VEVENT",
      `UID:${link.id}@crystalclean`,
      `DTSTART;TZID=America/New_York:${isoT(ws)}`,
      `DTEND;TZID=America/New_York:${isoT(we)}`,
      `SUMMARY:${title}`,
      `LOCATION:${fullAddr.replace(/,/g, "\\,")}`,
      `DESCRIPTION:${details}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "crystal-clean.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const phoneBlock = (
    <>
      {needPhone && (
        <label>
          <span className="lbl2">Mobile number for your confirmation</span>
          <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
      )}
      {!needPhone && (
        <div className="phone-line">
          We&apos;ll text <b>{phone}</b> ·{" "}
          <button type="button" className="linkbtn" onClick={() => setPhoneEdit(true)}>
            Change
          </button>
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={textMe} onChange={(e) => setTextMe(e.target.checked)} />
        Text me updates about my booking
      </label>
    </>
  );

  return (
    <div className={preview ? "bp preview" : "bp full"} ref={rootRef}>
      <header className="hdr">
        <div className="wrap">
          <div className="hdr-in">
            <span className="logo" role="img" aria-label="Crystal Clean">
              <Roofline width={112} height={14} stroke={5.5} />
              <span className="logo-word" aria-hidden="true">
                Crystal Clean
              </span>
            </span>
            <a className="txt-link" href={textUsHref}>
              <Chat />
              Text us
            </a>
          </div>
        </div>
      </header>

      {showMain && (
        <>
          <main className="wrap main">
            <div className="col">
              <section aria-labelledby="hi">
                <h1 className="h1" id="hi">
                  Hi {first}, your clean is ready to book
                </h1>
                <p className="sub">Prepared for you by {sentBy} at Crystal Clean</p>
                {!!(link.msg || "").trim() && (
                  <div className="bubble">
                    <div className="av" aria-hidden="true">
                      {sentBy.charAt(0).toUpperCase()}
                    </div>
                    <div className="bub" style={{ whiteSpace: "pre-wrap" }}>
                      <div className="who">{sentBy}</div>
                      {link.msg}
                    </div>
                  </div>
                )}
              </section>

              <section aria-labelledby="rt">
                <h2 className="sr" id="rt">
                  Your cleaning time
                </h2>
                <div className="slot">
                  <div className="slot-top">
                    <div className="cal" aria-hidden="true">
                      <CalIcon size={28} stroke="#C9A25E" w={1.7} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="slot-date">{dateLong}</div>
                      <div className="slot-win">{winLong}</div>
                    </div>
                  </div>
                  {addr && (
                    <div className="slot-row">
                      <svg viewBox="0 0 24 24" width="20" height="20" {...S} stroke="#C9A25E" strokeWidth="1.7" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
                        <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
                      </svg>
                      <span>{addr}</span>
                    </div>
                  )}
                  <div className="slot-lock">
                    <svg viewBox="0 0 24 24" width="18" height="18" {...S} stroke="#C9A25E" strokeWidth="1.9" aria-hidden="true">
                      <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
                    </svg>
                    <span>We&apos;ve reserved this time for you.</span>
                    <span className="lockchip">Set time</span>
                  </div>
                </div>
                <p className="after-slot">
                  Need a different time?{" "}
                  <a href={smsBody(`Hi, this is ${first}. Could we find a different time than ${dateShort}, ${winShort}?`)} style={{ fontWeight: 700 }}>
                    Text us
                  </a>
                </p>
              </section>

              <section aria-labelledby="co">
                <h2 className="h2" id="co">
                  {single ? "Your price" : "Choose your option"}
                </h2>
                <div className={`opts n${options.length}`} role={single ? "group" : "radiogroup"} aria-labelledby="co">
                  {options.map((o) => {
                    const on = o.id === pickedId;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={single ? "opt single" : on ? "opt sel" : "opt"}
                        role={single ? undefined : "radio"}
                        aria-checked={single ? undefined : on}
                        onClick={single ? undefined : () => setPicked(o.id)}
                      >
                        {!single && on && (
                          <span className="tick" aria-hidden="true">
                            <Check size={16} w={3} />
                          </span>
                        )}
                        {!single && !on && <span className="ring" aria-hidden="true" />}
                        {o.badge && <span className="badge">{o.badge}</span>}
                        <span className="opt-n">{o.name}</span>
                        <span className="price">
                          <span className="amt">{money(o.price)}</span>
                          <span className="per">{o.type === "plan" ? "per clean" : ""}</span>
                        </span>
                        <span className="opt-d">{descFor(o)}</span>
                        {o.note && (
                          <span className="opt-note">
                            <svg viewBox="0 0 24 24" width="18" height="18" {...S} stroke="#7A5D27" strokeWidth="1.8" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
                              <path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z" />
                            </svg>
                            {o.note}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="small">Price is for your home as described below. No payment needed today.</p>
              </section>

              <section className="card pad" aria-labelledby="yh">
                <h2 className="h2" id="yh">
                  Your home
                </h2>
                <p className="sub">Your price is based on these details.</p>
                <ul className="rows">
                  {[
                    ["Home type", c.type === "rental" ? "Vacation rental" : "Home"],
                    ["Bedrooms", Number(c.beds) === 0 ? "Studio" : String(c.beds)],
                    ["Bathrooms", bathsLabel(Number(c.baths) || 1)],
                    ["Size", c.size || "Not set"],
                    ["Last professional clean", c.last || "Not set"],
                    ["Plan you asked about", c.plan || "Not set"],
                  ].map(([k, v]) => (
                    <li key={k}>
                      <span className="k">{k}</span>
                      <span className="v">{v}</span>
                    </li>
                  ))}
                  <li>
                    <span className="k">Extras</span>
                    <span className="v">
                      {!ex.length && "None"}
                      {ex.map((x) => (
                        <span key={x.name} className="xchip">
                          {x.name}
                        </span>
                      ))}
                    </span>
                  </li>
                  <li>
                    <span className="k">Notes</span>
                    <span className="v" style={{ whiteSpace: "pre-wrap" }}>
                      {(c.notes || "").trim() || "None"}
                    </span>
                  </li>
                </ul>
                <div className="foot-note">
                  Something&apos;s not right?{" "}
                  <a href={smsBody(`Hi, this is ${first}. One of my home details needs a fix: `)} style={{ fontWeight: 700 }}>
                    Text us
                  </a>{" "}
                  before you confirm.
                </div>
              </section>

              <section className="card pad" aria-labelledby="we">
                <h2 className="h2" id="we">
                  What to expect
                </h2>
                <p className="sub">Your standard clean includes:</p>
                <div className="rooms">
                  {ROOMS.map(([k, name, items]) => {
                    const isOpen = !mobile || !!open[k];
                    return (
                      <div key={k} className={isOpen ? "room open" : "room"}>
                        {mobile ? (
                          <button type="button" className="room-btn" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [k]: !open[k] })}>
                            <span className="room-t">{name}</span>
                            <svg viewBox="0 0 24 24" width="22" height="22" {...S} stroke="#0E1F3D" strokeWidth="2" aria-hidden="true" style={isOpen ? { transform: "rotate(180deg)" } : undefined}>
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>
                        ) : (
                          <h3 className="room-t" style={{ margin: 0 }}>
                            {name}
                          </h3>
                        )}
                        {isOpen && (
                          <ul className="checks">
                            {items.map((it) => (
                              <li key={it}>
                                <span className="ck" aria-hidden="true">
                                  <Check />
                                </span>
                                {it}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!!ex.length && (
                  <div className="plus">
                    <span className="ck" aria-hidden="true" style={{ marginTop: 2 }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" {...S} stroke="#0E1F3D" strokeWidth="3.4">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                    <div>
                      <div style={{ fontWeight: 700 }}>Plus your extras</div>
                      {ex.map((x) => (
                        <div key={x.name} style={{ fontSize: 15 }}>
                          <b>{x.name}</b>
                          {x.desc ? `: ${x.desc}` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h3 className="h3" style={{ marginTop: 28 }}>
                  On cleaning day
                </h3>
                <div className="daysteps">
                  <div className="ds">
                    <span className="ico" aria-hidden="true">
                      <Chat size={22} />
                    </span>
                    <span>We text you the day before to confirm.</span>
                  </div>
                  <div className="ds">
                    <span className="ico" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="22" height="22" {...S} stroke="#0E1F3D" strokeWidth="1.7">
                        <path d="M5 9h14l-1.5 11h-11zM8 9a4 4 0 0 1 8 0" />
                      </svg>
                    </span>
                    <span>The team arrives within your window and brings all supplies.</span>
                  </div>
                  <div className="ds">
                    <span className="ico" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="22" height="22" {...S} stroke="#0E1F3D" strokeWidth="1.7">
                        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
                      </svg>
                    </span>
                    <span>We text you when we&apos;re done.</span>
                  </div>
                </div>

                <h3 className="h3" style={{ marginTop: 28 }}>
                  Good to know
                </h3>
                <div className="good">
                  <div className="gd">
                    <svg viewBox="0 0 24 24" width="22" height="22" {...S} stroke="#7A5D27" strokeWidth="1.8" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path d="M5 9h14l-1.5 11h-11zM8 9a4 4 0 0 1 8 0" />
                    </svg>
                    Supplies included
                  </div>
                  <div className="gd">
                    <svg viewBox="0 0 24 24" width="22" height="22" {...S} stroke="#7A5D27" strokeWidth="1.8" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path d="M8.5 17.5c0-2.8 2-5 4.3-5s4.2 2.2 4.2 4.5c0 1.8-1.4 2.5-2.9 2.1-1-.3-1.8-.3-2.8 0-1.6.5-2.8-.1-2.8-1.6zM7 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM15.5 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM18 9.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
                    </svg>
                    Pet-friendly
                  </div>
                  <div className="gd">
                    <svg viewBox="0 0 24 24" width="22" height="22" {...S} stroke="#7A5D27" strokeWidth="1.8" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.5 3.2-6 6.5-6s6 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2 .7 3.3 3 3.5 6" />
                    </svg>
                    Same team every visit on a plan
                  </div>
                  <div className="gd">
                    <Chat size={22} stroke="#7A5D27" w={1.8} />
                    Anything missed? Text us and we&apos;ll make it right.
                  </div>
                </div>
              </section>

              <section className="card pad mconfirm" aria-labelledby="cf">
                <h2 className="h2" id="cf">
                  Confirm your booking
                </h2>
                {phoneBlock}
              </section>
            </div>

            <aside className="card side" aria-label="Confirm your booking">
              <h2 className="h2" style={{ fontSize: 26 }}>
                Confirm your booking
              </h2>
              <div className="sel-sum">
                <div className="lbl">Your choice</div>
                <div className="val">{selText}</div>
                <div style={{ fontSize: 15, color: "#5B6474", marginTop: 2 }}>
                  {dateShort} · {winShort}
                </div>
              </div>
              {phoneBlock}
              <button type="button" className="btn btn-lg btn-block" disabled={cantConfirm} onClick={onConfirm}>
                {busy ? "Confirming…" : "Confirm my booking"}
              </button>
              {!sel && <p className="hint">Choose an option to continue.</p>}
              {err && (
                <p className="ferr" role="alert">
                  {err}
                </p>
              )}
              <p className="fr">No payment today. You&apos;ll get a confirmation by text.</p>
            </aside>
          </main>

          <div className="sbar" role="region" aria-label="Confirm your booking">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{selText}</span>
              <span style={{ fontSize: 14, color: "#5B6474", whiteSpace: "nowrap" }}>{dateTiny}</span>
            </div>
            <button type="button" className="btn btn-lg btn-block" disabled={cantConfirm} onClick={onConfirm}>
              {busy ? "Confirming…" : "Confirm my booking"}
            </button>
            {err && (
              <p className="ferr" role="alert">
                {err}
              </p>
            )}
            <p className="fr" style={{ marginTop: 8 }}>
              No payment today. You&apos;ll get a confirmation by text.
            </p>
          </div>
        </>
      )}

      {done && status !== "cancelled" && (
        <main className="done">
          <div className="done-top">
            <svg className="okc" viewBox="0 0 80 80" width="88" height="88" aria-hidden="true">
              <circle cx="40" cy="40" r="30" fill="none" stroke="#C9A25E" strokeWidth="4" />
              <path className="m" d="m27 41 9 9 17-19" fill="none" stroke="#C9A25E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="h1">You&apos;re booked, {first}!</h1>
            <p className="sub" style={{ margin: 0, fontSize: 18 }}>
              {already ? "This booking is confirmed. Need to change something? Text us." : textMe ? `We'll send a confirmation to ${phone || "your phone"}.` : "Your booking is saved."}
            </p>
          </div>
          <div className="card sum">
            <ul className="rows" style={{ margin: 0 }}>
              <li>
                <span className="k">When</span>
                <span className="v">
                  {dateLong} · {winShort}
                </span>
              </li>
              {addr && (
                <li>
                  <span className="k">Where</span>
                  <span className="v">{addr}</span>
                </li>
              )}
              <li>
                <span className="k">Your choice</span>
                <span className="v">{selText}</span>
              </li>
              <li>
                <span className="k">Prepared by</span>
                <span className="v">{sentBy}</span>
              </li>
            </ul>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <button type="button" className="btn btn-lg" aria-expanded={calOpen} onClick={() => setCalOpen(!calOpen)} style={{ minWidth: 260 }}>
              <CalIcon />
              Add to calendar
            </button>
            {calOpen && (
              <div className="cal-pick">
                <a
                  className="btn btn-out"
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(title)}&dates=${isoT(ws)}/${isoT(we)}&ctz=America/New_York&location=${enc(fullAddr)}&details=${enc(details)}`}
                  target="_blank"
                  rel="noopener"
                >
                  Google
                </a>
                <button type="button" className="btn btn-out" onClick={icsDownload}>
                  Apple
                </button>
                <a
                  className="btn btn-out"
                  href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=${enc(title)}&startdt=${link.date}T${ws}:00&enddt=${link.date}T${we}:00&location=${enc(fullAddr)}&body=${enc(details)}`}
                  target="_blank"
                  rel="noopener"
                >
                  Outlook
                </a>
              </div>
            )}
            <a className="btn btn-out" href={textUsHref} style={{ minWidth: 260 }}>
              Text us
            </a>
          </div>
          <section className="card pad" aria-labelledby="nx">
            <h2 className="h2" id="nx" style={{ fontSize: 26 }}>
              What happens next
            </h2>
            <ol className="steps3">
              <li>
                <span className="mini" aria-hidden="true">
                  1
                </span>
                <span>{textMe ? "You get a confirmation text from us." : "Your booking is saved. Text us anytime with questions."}</span>
              </li>
              <li>
                <span className="mini" aria-hidden="true">
                  2
                </span>
                <span>We text you a reminder the day before.</span>
              </li>
              <li>
                <span className="mini" aria-hidden="true">
                  3
                </span>
                <span>
                  The team arrives within your window: {dateShort}, {winShort}.
                </span>
              </li>
            </ol>
            {sel?.type === "plan" && (
              <div className="foot-note" style={{ marginTop: 16 }}>
                Your next cleans are {freqOf(sel.freq)[1].toLowerCase()} after {dateLabel(link.date, { month: "short", day: "numeric" })}. We&apos;ll text you before each one.
              </div>
            )}
          </section>
        </main>
      )}

      {!done && status === "expired" && (
        <main className="state">
          <span className="ico" aria-hidden="true" style={{ width: 72, height: 72, background: "#fff" }}>
            <svg viewBox="0 0 24 24" width="34" height="34" {...S} stroke="#7A5D27" strokeWidth="1.6">
              <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" />
            </svg>
          </span>
          <h1 className="h1">This link has expired</h1>
          <p style={{ margin: 0, fontSize: 18 }}>Text us and we&apos;ll send a new one.</p>
          <a className="btn btn-lg" href={smsBody(`Hi, this is ${first}. My booking link expired. Could you send a new one?`)} style={{ marginTop: 8, minWidth: 240 }}>
            Text us
          </a>
        </main>
      )}

      {status === "cancelled" && (
        <main className="state">
          <span className="ico" aria-hidden="true" style={{ width: 72, height: 72, background: "#fff" }}>
            <svg viewBox="0 0 24 24" width="34" height="34" {...S} stroke="#7A5D27" strokeWidth="1.6">
              <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6 6l12 12" />
            </svg>
          </span>
          <h1 className="h1">This link is no longer active</h1>
          <p style={{ margin: 0, fontSize: 18 }}>Want to book a clean? Text us and we&apos;ll help.</p>
          <a className="btn btn-lg" href={smsBody(`Hi, this is ${first}. I'd like to book a clean.`)} style={{ marginTop: 8, minWidth: 240 }}>
            Text us
          </a>
        </main>
      )}
    </div>
  );
}
