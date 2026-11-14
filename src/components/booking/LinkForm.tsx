"use client";

/** "Create a booking link" admin screen, ported from website-design/admin.html. */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookView } from "./BookView";
import {
  autoName,
  newOpt,
  fromQuote,
  bathsLabel,
  blankCustomer,
  EXPIRES,
  EXTRAS,
  extraName,
  FREQ,
  freqOf,
  num,
  LASTS,
  PLANS,
  SIZES,
  TERMS,
  WINS,
  type LinkInput,
  type PriceOption,
  type QuotePick,
} from "@/lib/booking";

type FormOpt = PriceOption & { nameEdited: boolean };
type Form = Omit<LinkInput, "options"> & { options: FormOpt[] };
type Save = (body: unknown, editingId?: string) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;

const DAYN: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", any: "Any day" };
const WINN: Record<string, string> = { morning: "Morning", midday: "Midday", afternoon: "Afternoon", any: "Any time" };

const toForm = (i: LinkInput): Form => ({ ...i, options: i.options.map((o) => ({ ...o, nameEdited: o.name !== autoName(o) })) });

const S = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function LinkForm({
  quotes,
  initial,
  editing,
  save,
}: {
  quotes: QuotePick[];
  initial: LinkInput;
  editing?: { id: string; booked: boolean };
  save: Save;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [f, setFState] = useState<Form>(() => toForm(initial));
  const [manual, setManual] = useState(!initial.qid && !!initial.cust.name);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [dragId, setDragId] = useState("");
  const [overId, setOverId] = useState("");

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setMobile(el.clientWidth < 860);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const c = f.cust;
  const setF = (p: Partial<Form>) => {
    setFState((prev) => ({ ...prev, ...p }));
    setErr("");
  };
  const setC = <K extends keyof Form["cust"]>(k: K, v: Form["cust"][K]) => setF({ cust: { ...c, [k]: v } });
  const first = (c.name || "").trim().split(" ")[0];
  const firstName = first || "the customer";
  const req = quotes.find((r) => r.qid === f.qid);
  const haveCust = !!f.qid || manual;

  const updOpt = (id: string, p: Partial<FormOpt>) =>
    setF({
      options: f.options.map((o) => {
        if (o.id !== id) return o;
        const n = { ...o, ...p };
        if (!n.nameEdited) n.name = autoName(n);
        return n;
      }),
    });
  const move = (from: number, to: number) => {
    const a = f.options.slice();
    const [it] = a.splice(from, 1);
    a.splice(to, 0, it);
    setF({ options: a });
  };
  const fmt$ = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
  const calc = (o: FormOpt) => {
    const iv = freqOf(o.freq)[2];
    const p = num(o.price);
    if (o.term === "none") {
      const pm = 52 / 12 / iv;
      return `About ${Math.round(pm * 10) / 10} cleans a month · ~${fmt$(p * pm)} a month`;
    }
    const t = Number(o.term);
    const n = Math.floor(Math.round((t * 52) / 12) / iv);
    return `About ${n} ${n === 1 ? "clean" : "cleans"} · ~${fmt$(n * p)} over ${t} ${t === 1 ? "month" : "months"}`;
  };

  const ql = q.trim().toLowerCase();
  const results = quotes.filter((r) => !ql || r.cust.name.toLowerCase().includes(ql) || r.zip.includes(ql)).slice(0, 8);
  const pickQuote = (r: QuotePick) => {
    const nf = fromQuote(r);
    setF({ qid: nf.qid, cust: nf.cust, win: f.date ? f.win : nf.win, msg: f.msg || nf.msg });
  };

  const sizeOpts = SIZES.includes(c.size) ? SIZES : [c.size, ...SIZES];
  const lastOpts = LASTS.includes(c.last) ? LASTS : [c.last, ...LASTS];
  const planOpts = PLANS.includes(c.plan) ? PLANS : [c.plan, ...PLANS];
  const exAvail = EXTRAS.filter((e) => !(c.extras || []).includes(e[0]));

  async function create() {
    const errs: string[] = [];
    if (!(c.name || "").trim()) errs.push("a customer name");
    if (!f.date) errs.push("a date");
    if (f.options.some((o) => !num(o.price))) errs.push("a price for every option");
    if (errs.length) {
      setErr(`Add ${errs.join(", ")} to create the link.`);
      return;
    }
    setBusy(true);
    try {
      const r = await save({ ...f, options: f.options.map((o): PriceOption => ({ id: o.id, type: o.type, freq: o.freq, term: o.term, price: o.price, name: o.name, note: o.note, badge: o.badge })) }, editing?.id);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      router.push(`/admin/links/${r.id}?${editing ? "saved" : "created"}=1`);
    } catch {
      setErr("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const createLabel = busy ? "Saving…" : editing ? "Save changes" : "Create link";
  const preview = (
    <BookView
      preview
      link={{
        id: "preview",
        status: "sent",
        cust: c,
        date: f.date,
        win: f.win,
        cStart: f.cStart,
        cEnd: f.cEnd,
        options: f.options.map((o) => ({ ...o, price: o.price || "" })),
        sentBy: f.sentBy,
        msg: f.msg,
      }}
    />
  );

  const chip = (on: boolean) => (on ? "chip sel" : "chip");
  const seg = (on: boolean) => (on ? "segb on" : "segb");

  return (
    <div ref={rootRef}>
      <main className="wrap">
        <div className="phead">
          <div>
            <h1 className="ptitle">{editing ? "Edit booking link" : "Create a booking link"}</h1>
            <p className="psub">Set the time and price, then text the link.</p>
          </div>
        </div>
        <div className="cgrid">
          <div className="form">
            {editing?.booked && (
              <div className="warn" role="alert">
                <svg viewBox="0 0 24 24" width="22" height="22" {...S} stroke="#7A5D27" strokeWidth="2" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M12 3 2 20h20zM12 10v4M12 17v.5" />
                </svg>
                <span>{firstName} already booked this. If you change the date, time or price, text them so they know.</span>
              </div>
            )}

            <section className="card sec" aria-labelledby="s1">
              <div className="sec-h">
                <span className="num" aria-hidden="true">
                  1
                </span>
                <h2 className="h2" id="s1">
                  Customer
                </h2>
              </div>
              {!haveCust && (
                <>
                  <label className="field" style={{ marginTop: 16 }}>
                    <span className="lbl">Find a quote request</span>
                    <input className="input" type="search" placeholder="Search by name or ZIP" value={q} onChange={(e) => setQ(e.target.value)} />
                  </label>
                  <div className="results" role="list">
                    {results.map((r) => (
                      <div role="listitem" key={r.qid}>
                        <button type="button" className="res" onClick={() => pickQuote(r)}>
                          <span>
                            <span className="n">{r.cust.name || "No name"}</span>
                            <br />
                            <span className="m">
                              ZIP {r.zip} · {r.cust.type === "rental" ? "Vacation rental" : "Home"}
                            </span>
                          </span>
                          <span className="m">Received {r.received}</span>
                        </button>
                      </div>
                    ))}
                    {!results.length && <p className="help">{quotes.length ? "No quote requests match." : "No quote requests yet."}</p>}
                  </div>
                  <button
                    type="button"
                    className="linkbtn"
                    style={{ marginTop: 6 }}
                    onClick={() => {
                      setManual(true);
                      setF({ qid: "", cust: blankCustomer() });
                    }}
                  >
                    Enter manually
                  </button>
                </>
              )}
              {haveCust && (
                <>
                  <div className="picked">
                    <span>
                      <b>{(c.name || "").trim() || "New customer"}</b>{" "}
                      <span style={{ color: "#5B6474" }}>{req ? `· from quote received ${req.received}` : f.qid ? "· from a quote request" : "· entered manually"}</span>
                    </span>
                    <button
                      type="button"
                      className="linkbtn"
                      onClick={() => {
                        setManual(false);
                        setQ("");
                        setF({ qid: "", cust: blankCustomer() });
                      }}
                    >
                      Change
                    </button>
                  </div>
                  <div className="fgrid">
                    <label className="field">
                      <span className="lbl">Name</span>
                      <input className="input" autoComplete="off" value={c.name} onChange={(e) => setC("name", e.target.value)} />
                    </label>
                    <label className="field">
                      <span className="lbl">Mobile</span>
                      <input className="input" type="tel" value={c.phone} onChange={(e) => setC("phone", e.target.value)} />
                    </label>
                    <label className="field span2">
                      <span className="lbl">
                        Email <span className="opt-lbl">(optional)</span>
                      </span>
                      <input className="input" type="email" value={c.email} onChange={(e) => setC("email", e.target.value)} />
                    </label>
                    <label className="field">
                      <span className="lbl">Street address</span>
                      <input className="input" value={c.addr} onChange={(e) => setC("addr", e.target.value)} />
                    </label>
                    <label className="field">
                      <span className="lbl">ZIP</span>
                      <input className="input" inputMode="numeric" maxLength={5} value={c.zip} onChange={(e) => setC("zip", e.target.value.replace(/\D/g, ""))} />
                    </label>
                    <label className="field span2">
                      <span className="lbl">
                        Apt, gate or parking notes <span className="opt-lbl">(optional, only you see this)</span>
                      </span>
                      <input className="input" placeholder="e.g. Gate code, park in driveway" value={c.addrNotes} onChange={(e) => setC("addrNotes", e.target.value)} />
                    </label>
                    <div className="field span2">
                      <span className="lbl" id="ht">
                        Home type
                      </span>
                      <div className="seg" role="group" aria-labelledby="ht">
                        {(
                          [
                            ["home", "Home"],
                            ["rental", "Vacation rental"],
                          ] as const
                        ).map(([k, l]) => (
                          <button key={k} type="button" className={seg(c.type === k)} aria-pressed={c.type === k} onClick={() => setC("type", k)}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <span className="lbl" id="bd">
                        Bedrooms
                      </span>
                      <div className="stepper" role="group" aria-labelledby="bd">
                        <button type="button" aria-label="Fewer bedrooms" onClick={() => setC("beds", Math.max(0, (c.beds || 0) - 1))}>
                          −
                        </button>
                        <div className="val" aria-live="polite">
                          {c.beds === 0 ? "Studio" : c.beds}
                        </div>
                        <button type="button" aria-label="More bedrooms" onClick={() => setC("beds", Math.min(8, (c.beds || 0) + 1))}>
                          +
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <span className="lbl" id="ba">
                        Bathrooms
                      </span>
                      <div className="stepper" role="group" aria-labelledby="ba">
                        <button type="button" aria-label="Fewer bathrooms" onClick={() => setC("baths", Math.max(1, (c.baths || 1) - 0.5))}>
                          −
                        </button>
                        <div className="val" aria-live="polite">
                          {bathsLabel(c.baths || 1)}
                        </div>
                        <button type="button" aria-label="More bathrooms" onClick={() => setC("baths", Math.min(8, (c.baths || 1) + 0.5))}>
                          +
                        </button>
                      </div>
                    </div>
                    <label className="field">
                      <span className="lbl">Size</span>
                      <select className="input" value={c.size} onChange={(e) => setC("size", e.target.value)}>
                        {sizeOpts.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="lbl">Last professional clean</span>
                      <select className="input" value={c.last} onChange={(e) => setC("last", e.target.value)}>
                        {lastOpts.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field span2">
                      <span className="lbl">Plan they asked about</span>
                      <select className="input" value={c.plan} onChange={(e) => setC("plan", e.target.value)}>
                        {planOpts.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="field span2">
                      <span className="lbl" id="exl">
                        Extras
                      </span>
                      <div className="chips" role="group" aria-labelledby="exl">
                        {(c.extras || []).map((k) => (
                          <span key={k} className="xchip">
                            {extraName(k)}
                            <button type="button" aria-label={`Remove ${extraName(k)}`} onClick={() => setC("extras", c.extras.filter((x) => x !== k))}>
                              <svg viewBox="0 0 24 24" width="16" height="16" {...S} stroke="#0E1F3D" strokeWidth="2.4" aria-hidden="true">
                                <path d="M6 6l12 12M18 6 6 18" />
                              </svg>
                            </button>
                          </span>
                        ))}
                        {!!exAvail.length && (
                          <label>
                            <span className="sr">Add extra</span>
                            <select
                              className="addx"
                              value=""
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v) setC("extras", (c.extras || []).concat([v]));
                              }}
                            >
                              <option value="">+ Add extra</option>
                              {exAvail.map((e) => (
                                <option key={e[0]} value={e[0]}>
                                  {e[1]}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    </div>
                    <label className="field span2">
                      <span className="lbl">
                        Notes <span className="opt-lbl">(optional)</span>
                      </span>
                      <textarea className="input" placeholder="Pets, focus areas, how to get in" value={c.notes} onChange={(e) => setC("notes", e.target.value)} />
                    </label>
                  </div>
                </>
              )}
            </section>

            <section className="card sec" aria-labelledby="s2">
              <div className="sec-h">
                <span className="num" aria-hidden="true">
                  2
                </span>
                <h2 className="h2" id="s2">
                  Date and time
                </h2>
              </div>
              <div className="fgrid">
                <div className="field span2" style={{ display: "flex", flexWrap: "wrap", gap: "12px 16px", alignItems: "flex-end" }}>
                  <label className="field" style={{ flex: "1 1 220px" }}>
                    <span className="lbl">Date</span>
                    <input className="input" type="date" value={f.date} onChange={(e) => setF({ date: e.target.value })} />
                  </label>
                  {req && (req.days.length > 0 || req.wins.length > 0) && (
                    <span className="pref" style={{ marginBottom: 10 }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" {...S} stroke="#7A5D27" strokeWidth="2" aria-hidden="true">
                        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" />
                      </svg>
                      {first} prefers: {req.days.map((d) => DAYN[d] ?? d).join(", ") || "Any day"} · {req.wins.map((w) => WINN[w] ?? w).join(", ") || "Any time"}
                    </span>
                  )}
                </div>
                <div className="field span2">
                  <span className="lbl" id="awl">
                    Arrival window
                  </span>
                  <div className="chips" role="group" aria-labelledby="awl">
                    {WINS.map((w) => (
                      <button key={w[0]} type="button" className={chip(f.win === w[0])} aria-pressed={f.win === w[0]} onClick={() => setF({ win: w[0] })}>
                        {w[1]}
                      </button>
                    ))}
                  </div>
                </div>
                {f.win === "custom" && (
                  <>
                    <label className="field">
                      <span className="lbl">Arrive from</span>
                      <input className="input" type="time" value={f.cStart} onChange={(e) => setF({ cStart: e.target.value })} />
                    </label>
                    <label className="field">
                      <span className="lbl">Arrive by</span>
                      <input className="input" type="time" value={f.cEnd} onChange={(e) => setF({ cEnd: e.target.value })} />
                    </label>
                  </>
                )}
              </div>
              <p className="help" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" {...S} stroke="#5B6474" strokeWidth="2" aria-hidden="true">
                  <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
                </svg>
                The customer sees this date and time but can&apos;t change it.
              </p>
            </section>

            <section className="card sec" aria-labelledby="s3">
              <div className="sec-h">
                <span className="num" aria-hidden="true">
                  3
                </span>
                <h2 className="h2" id="s3">
                  Price options
                </h2>
                <span className="help" style={{ margin: "0 0 0 auto" }}>
                  {f.options.length} of 3
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
                {f.options.map((o, i) => (
                  <div
                    key={o.id}
                    className={overId === o.id && dragId && dragId !== o.id ? "ocard drag" : "ocard"}
                    draggable
                    onDragStart={(e) => {
                      // Only drag from the card itself, not while selecting text in a field.
                      if ((e.target as HTMLElement).closest("input,textarea,select")) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", o.id);
                      setDragId(o.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (overId !== o.id) setOverId(o.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = f.options.findIndex((x) => x.id === dragId);
                      if (from >= 0 && from !== i) move(from, i);
                      setDragId("");
                      setOverId("");
                    }}
                    onDragEnd={() => {
                      setDragId("");
                      setOverId("");
                    }}
                  >
                    <div className="ohead">
                      <span className="grip" aria-hidden="true" title="Drag to reorder">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="#5B6474" aria-hidden="true">
                          <circle cx="9" cy="6" r="1.6" />
                          <circle cx="15" cy="6" r="1.6" />
                          <circle cx="9" cy="12" r="1.6" />
                          <circle cx="15" cy="12" r="1.6" />
                          <circle cx="9" cy="18" r="1.6" />
                          <circle cx="15" cy="18" r="1.6" />
                        </svg>
                      </span>
                      <span className="otitle">Option {i + 1}</span>
                      <button type="button" className="iconb" aria-label={`Move option ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                        <svg viewBox="0 0 24 24" width="20" height="20" {...S} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="m6 15 6-6 6 6" />
                        </svg>
                      </button>
                      <button type="button" className="iconb" aria-label={`Move option ${i + 1} down`} disabled={i === f.options.length - 1} onClick={() => move(i, i + 1)}>
                        <svg viewBox="0 0 24 24" width="20" height="20" {...S} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="iconb"
                        aria-label={`Remove option ${i + 1}`}
                        disabled={f.options.length === 1}
                        onClick={() => setF({ options: f.options.filter((x) => x.id !== o.id) })}
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" {...S} stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                    <div className="seg" role="group" aria-label={`Option ${i + 1} type`}>
                      {(
                        [
                          ["once", "One-time clean"],
                          ["plan", "Plan"],
                        ] as const
                      ).map(([k, l]) => (
                        <button key={k} type="button" className={seg(o.type === k)} aria-pressed={o.type === k} onClick={() => updOpt(o.id, { type: k })}>
                          {l}
                        </button>
                      ))}
                    </div>
                    {o.type === "plan" && (
                      <>
                        <div>
                          <span className="lbl">Frequency</span>
                          <div className="chips" role="group" aria-label="Frequency">
                            {FREQ.map((t) => (
                              <button key={t[0]} type="button" className={chip(o.freq === t[0])} aria-pressed={o.freq === t[0]} onClick={() => updOpt(o.id, { freq: t[0] })}>
                                {t[1]}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="lbl">Term</span>
                          <div className="chips" role="group" aria-label="Term">
                            {TERMS.map((t) => (
                              <button key={t[0]} type="button" className={chip(o.term === t[0])} aria-pressed={o.term === t[0]} onClick={() => updOpt(o.id, { term: t[0] })}>
                                {t[1]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="fgrid" style={{ marginTop: 0 }}>
                      <label className="field">
                        <span className="lbl">{o.type === "plan" ? "Price per clean" : "Price"}</span>
                        <span className="money">
                          <span aria-hidden="true">$</span>
                          <input className="input" inputMode="decimal" placeholder="0" value={o.price} onChange={(e) => updOpt(o.id, { price: e.target.value.replace(/[^0-9.]/g, "") })} />
                        </span>
                      </label>
                      <label className="field">
                        <span className="lbl">Option name</span>
                        <input className="input" value={o.name} onChange={(e) => updOpt(o.id, { name: e.target.value, nameEdited: !!e.target.value.trim() })} />
                      </label>
                      <label className="field span2">
                        <span className="lbl">
                          Short note <span className="opt-lbl">(optional, shown under the price)</span>
                        </span>
                        <input
                          className="input"
                          maxLength={90}
                          placeholder="e.g. Not happy after your first clean? Cancel anytime."
                          value={o.note}
                          onChange={(e) => updOpt(o.id, { note: e.target.value })}
                        />
                      </label>
                      <div className="field span2">
                        <span className="lbl">
                          Badge <span className="opt-lbl">(optional)</span>
                        </span>
                        <div className="seg" role="group" aria-label="Badge">
                          {(
                            [
                              ["", "None"],
                              ["Most popular", "Most popular"],
                              ["Best value", "Best value"],
                            ] as const
                          ).map(([k, l]) => (
                            <button key={l} type="button" className={seg(o.badge === k)} aria-pressed={o.badge === k} onClick={() => updOpt(o.id, { badge: k })}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {o.type === "plan" && (
                      <div className="calc">
                        <svg viewBox="0 0 24 24" width="18" height="18" {...S} stroke="#0E1F3D" strokeWidth="1.8" aria-hidden="true">
                          <path d="M5 3h14v18H5zM8 7h8M8 11h2M12 11h2M16 11v6M8 15h2M12 15h2" />
                        </svg>
                        {calc(o)}
                        <span className="only">Only you see this</span>
                      </div>
                    )}
                  </div>
                ))}
                {f.options.length < 3 && (
                  <button type="button" className="addopt" onClick={() => setF({ options: f.options.concat([{ ...newOpt(), nameEdited: false }]) })}>
                    + Add another option
                  </button>
                )}
              </div>
            </section>

            <section className="card sec" aria-labelledby="s4">
              <div className="sec-h">
                <span className="num" aria-hidden="true">
                  4
                </span>
                <h2 className="h2" id="s4">
                  Message
                </h2>
              </div>
              <div className="fgrid">
                <label className="field">
                  <span className="lbl">Sent by</span>
                  <input className="input" value={f.sentBy} onChange={(e) => setF({ sentBy: e.target.value })} />
                </label>
                <div className="field" />
                <label className="field span2">
                  <span className="lbl">
                    Personal note <span className="opt-lbl">(optional)</span>
                  </span>
                  <textarea
                    className="input"
                    placeholder={`Hi ${first || "there"}! Here's your price. Pick the option that works for you and tap confirm.`}
                    value={f.msg}
                    onChange={(e) => setF({ msg: e.target.value })}
                  />
                </label>
                <div className="field span2">
                  <span className="lbl" id="exp">
                    Link expires
                  </span>
                  <div className="chips" role="group" aria-labelledby="exp">
                    {EXPIRES.map((t) => (
                      <button key={t[0]} type="button" className={chip(f.expires === t[0])} aria-pressed={f.expires === t[0]} onClick={() => setF({ expires: t[0] })}>
                        {t[1]}
                      </button>
                    ))}
                  </div>
                  <p className="help">After this, the customer sees &quot;This link has expired, text us for a new one&quot;.</p>
                </div>
              </div>
            </section>

            {err && (
              <div className="err" role="alert">
                {err}
              </div>
            )}
            <div className="actions">
              <button type="button" className="linkbtn" onClick={() => router.push("/admin/links")}>
                Cancel
              </button>
              <button type="button" className="btn btn-lg" disabled={busy} onClick={create}>
                {createLabel}
              </button>
            </div>
          </div>

          {!mobile && (
            <aside className="pv" aria-label="Live preview of the customer page">
              <span className="pv-l">Live preview · what {firstName} sees</span>
              <div className="phone">
                <div className="screen">{preview}</div>
              </div>
            </aside>
          )}
        </div>
      </main>
      <div className="sbar">
        <button type="button" className="btn btn-out" onClick={() => setSheet(true)} style={{ flex: "0 0 auto" }}>
          Preview
        </button>
        <button type="button" className="btn" disabled={busy} onClick={create}>
          {createLabel}
        </button>
      </div>
      {sheet && mobile && (
        <div className="sheet-bg" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Customer page preview" onClick={(e) => e.stopPropagation()}>
            <div className="grab" aria-hidden="true" />
            <div className="sheet-h">
              <b>What {firstName} sees</b>
              <button type="button" className="linkbtn" onClick={() => setSheet(false)}>
                Done
              </button>
            </div>
            <div className="sheet-b">{preview}</div>
          </div>
        </div>
      )}
    </div>
  );
}
