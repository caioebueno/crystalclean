"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { moveLeadAction, restoreLeadAction, saveStagesAction } from "@/app/admin/submissions/actions";
import { MAX_LABEL, MAX_MIDDLE, REASONS, isFixed, linkStage, nextOf, stageName, type PipeState, type Stage, type StageDef } from "@/lib/pipelineStages";
import type { BoardLead } from "./types";
import "./board.css";

type Range = "week" | "month" | "all";
type Sheet = { kind: "move" | "discard" | "detail"; id: string } | { kind: "columns"; id?: undefined } | null;
type Toast = { text: string; undo?: { id: string; saved: PipeState | null; state: PipeState } } | null;


const ms = (iso: string) => Date.parse(iso) || 0;

function ago(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - ms(iso)) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} ${d === 1 ? "day" : "days"} ago`;
  return new Date(ms(iso)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

/** Start of this week (Sunday) / month, in Florida time. */
function rangeStart(range: Range, now: number) {
  if (range === "all") return 0;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric", weekday: "short" }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = Number(get("year"));
  const mo = Number(get("month"));
  const d = Number(get("day"));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  // Midnight in New York is 04:00 UTC in summer and 05:00 in winter; 04:00 is close enough for a count.
  const day = range === "week" ? d - wd : 1;
  return Date.UTC(y, mo - 1, day, 4);
}

const Phone = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#0E1F3D" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);
const Bubble = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#0E1F3D" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.3-4A8 8 0 1 1 20 12z" />
  </svg>
);
const Dots = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="#0E1F3D" aria-hidden="true">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

export function SubmissionsBoard({ stages: initialStages, leads: initial, now: serverNow, waitlistCount, notice, openId }: { stages: StageDef[]; leads: BoardLead[]; now: number; openId?: string; waitlistCount: number; notice: string[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [stages, setStages] = useState(initialStages);
  // After a refresh (e.g. columns saved), take the server's cards and columns.
  useEffect(() => setLeads(initial), [initial]);
  useEffect(() => setStages(initialStages), [initialStages]);
  const [showStats, setShowStats] = useState(false);
  // The board fills the screen below the header (and above the phone tab bar), so only columns scroll.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fit = () => {
      const el = rootRef.current;
      if (!el) return;
      // AdminShell's spacer under the page, there only when the phone tab bar is.
      const below = document.querySelector<HTMLElement>(".ap .btab-space")?.offsetHeight ?? 0;
      el.style.setProperty("--sbh", `${Math.max(360, window.innerHeight - el.getBoundingClientRect().top - window.scrollY - below)}px`);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const [draft, setDraft] = useState<StageDef[]>([]);
  const [now, setNow] = useState(serverNow);
  // Opened from the new-lead email: show that request, widening the range if it's older than this month.
  const opened = openId ? initial.find((l) => l.id === openId) : undefined;
  const [range, setRange] = useState<Range>(() => (opened && ms(opened.receivedAt) < rangeStart("month", serverNow) ? "all" : "month"));
  const [col, setCol] = useState<Stage>(opened?.state.stage ?? "new");
  const [sheet, setSheet] = useState<Sheet>(opened ? { kind: "detail", id: opened.id } : null);
  const [pick, setPick] = useState<Stage | "">("");
  const [reason, setReason] = useState("");
  const [dNote, setDNote] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState("");
  const [over, setOver] = useState("");
  const [flash, setFlash] = useState("");
  const tt = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ft = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      clearInterval(i);
      clearTimeout(tt.current);
      clearTimeout(ft.current);
    };
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  const showToast = (t: NonNullable<Toast>) => {
    setToast(t);
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast(null), 6000);
  };

  const patch = (id: string, saved: PipeState | null, state: PipeState) => setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, saved, state } : l)));

  async function moveTo(id: string, stage: Stage, extra?: { reason: string; dNote: string }) {
    const l0 = leads.find((l) => l.id === id);
    if (!l0 || busy) return;
    const before = { saved: l0.saved, state: l0.state };
    // Show the move right away, then save.
    patch(id, l0.saved, { ...l0.state, stage, reason: extra?.reason, dNote: extra?.dNote });
    setSheet(null);
    setPick("");
    setReason("");
    setDNote("");
    setErr("");
    setFlash(id);
    clearTimeout(ft.current);
    ft.current = setTimeout(() => setFlash(""), 2300);
    setBusy(true);
    const r = await moveLeadAction(id, stage, l0.state, extra).catch(() => ({ ok: false as const, error: "Could not save. Check your connection and try again." }));
    setBusy(false);
    if (!r.ok) {
      patch(id, before.saved, before.state);
      setErr(r.error);
      setToast(null);
      return;
    }
    patch(id, r.state, r.state);
    const first = l0.name.split(" ")[0];
    showToast({
      text: first + (stage === "lost" ? " discarded" : stage === "new" && l0.state.stage === "lost" ? ` restored to ${stageName(stages, "new")}` : ` moved to ${stageName(stages, stage)}`),
      undo: { id, ...before },
    });
  }

  async function undo() {
    const u = toast?.undo;
    if (!u) return;
    setToast(null);
    patch(u.id, u.saved, u.state);
    const r = await restoreLeadAction(u.id, u.saved).catch(() => ({ ok: false, error: "Could not undo. Try again." }));
    if (!r.ok) setErr(r.error ?? "Could not undo. Try again.");
  }

  // Column editor: works on a draft, saved in one go.
  function openColumns() {
    setDraft(stages.map((x) => ({ ...x })));
    setErr("");
    setSheet({ kind: "columns" });
  }
  const editDraft = (i: number, label: string) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, label } : x)));
  const moveDraft = (i: number, by: number) =>
    setDraft((d) => {
      const j = i + by;
      if (isFixed(d[i].id) || !d[j] || isFixed(d[j].id)) return d;
      const n = d.slice();
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const removeDraft = (i: number) => setDraft((d) => d.filter((_, j) => j !== i));
  const addDraft = () =>
    setDraft((d) => {
      const at = d.findIndex((x) => x.id === "won");
      return [...d.slice(0, at), { id: "", label: "", hint: "" }, ...d.slice(at)];
    });
  const draftMiddle = draft.filter((x) => !isFixed(x.id)).length;
  const draftErr = draft.some((x) => !x.label.trim())
    ? "Every column needs a name."
    : new Set(draft.map((x) => x.label.trim().toLowerCase())).size !== draft.length
      ? "Two columns have the same name."
      : "";

  async function saveColumns() {
    if (draftErr || busy) return;
    setBusy(true);
    const r = await saveStagesAction(draft).catch(() => ({ ok: false as const, error: "Could not save the columns. Try again." }));
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setStages(r.stages);
    setSheet(null);
    if (!r.stages.some((x) => x.id === col)) setCol(r.stages[0].id);
    showToast({ text: r.moved ? `Columns saved. ${r.moved} ${r.moved === 1 ? "card" : "cards"} moved over.` : "Columns saved" });
    // Reload cards so the ones from a removed column show where the server put them.
    if (r.moved) router.refresh();
  }

  const start = rangeStart(range, now);
  const inRange = useMemo(() => leads.filter((l) => ms(l.receivedAt) >= start), [leads, start]);
  const by = (k: Stage) => inRange.filter((l) => l.state.stage === k);
  const counts = Object.fromEntries(stages.map((x) => [x.id, by(x.id).length])) as Record<Stage, number>;
  const total = inRange.length;
  const won = counts.won;
  const lost = counts.lost;
  const open = total - won - lost;
  const removedWithCards = stages.filter((x) => !draft.some((d) => d.id === x.id) && by(x.id).length > 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const reasonCounts = REASONS.map((r) => ({ r, n: inRange.filter((l) => l.state.stage === "lost" && l.state.reason === r).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  const cur = sheet && sheet.kind !== "columns" ? leads.find((l) => l.id === sheet.id) : undefined;
  const colIdx = Math.max(0, stages.findIndex((x) => x.id === col));
  const sent = linkStage(stages);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const s = touch.current;
    touch.current = null;
    if (!s || !t || window.matchMedia("(min-width: 861px)").matches) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) setCol(stages[Math.min(stages.length - 1, Math.max(0, colIdx + (dx < 0 ? 1 : -1)))].id);
  };

  const statusOf = (l: BoardLead) => {
    const s = l.state;
    if (s.stage === "lost") return { text: (s.reason ?? "Discarded") + (s.dNote ? ` · ${s.dNote}` : ""), cls: "k-tag k-t-lost" };
    if (s.stage === "won") return { text: s.note || "Booked", cls: "k-tag k-t-won" };
    if (s.stage === sent) return { text: s.note || "Price texted", cls: "k-tag k-t-link" };
    if (s.stage !== "new" && s.note) return { text: s.note, cls: "k-tag k-t-link" };
    if (s.stage === "new" && now - ms(l.receivedAt) > 3600000) return { text: `Waiting ${ago(l.receivedAt, now).replace(" ago", "")}`, cls: "k-tag k-t-wait" };
    return null;
  };

  const customerHref = (l: BoardLead) => (l.link?.customerId ? `/admin/customers?c=${encodeURIComponent(l.link.customerId)}` : "/admin/customers");

  return (
    <div className="sb" ref={rootRef}>
      <div className="k-head">
        <div className="k-hl">
          <h1 className="k-h1">Submissions</h1>
          {waitlistCount > 0 && (
            <Link href="/admin/submissions?show=waitlist" className="k-wl">
              Waitlist signups ({waitlistCount})
            </Link>
          )}
        </div>
        <div className="k-tools">
        <button type="button" className={showStats ? "k-tb k-on" : "k-tb"} aria-pressed={showStats} aria-controls="k-stats" onClick={() => setShowStats((v) => !v)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0E1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          </svg>
          {showStats ? "Hide analytics" : "Show analytics"}
        </button>
        <button type="button" className="k-tb" onClick={openColumns}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0E1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z" />
          </svg>
          Edit columns
        </button>
        <div className="k-seg" role="group" aria-label="Time range">
          {(
            [
              ["week", "This week"],
              ["month", "This month"],
              ["all", "All time"],
            ] as [Range, string][]
          ).map(([k, label]) => (
            <button key={k} type="button" className={range === k ? "k-segb k-on" : "k-segb"} aria-pressed={range === k} onClick={() => setRange(k)}>
              {label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {notice.map((n) => (
        <p key={n} className="k-warn">
          {n}
        </p>
      ))}
      {err && (
        <p className="k-warn k-err" role="alert">
          {err}
        </p>
      )}

      {showStats && (
      <section className="k-stats" id="k-stats" aria-label="Analytics">
        <div>
          <div className="k-sgrid">
            <div className="k-st">
              <span className="k-n">{total}</span>
              <span className="k-l">Total</span>
            </div>
            <div className="k-st">
              <span className="k-n">{total - counts.new}</span>
              <span className="k-l">Contacted</span>
            </div>
            <div className="k-st k-win">
              <span className="k-n">{won}</span>
              <span className="k-l">Success</span>
            </div>
            <div className="k-st k-lost">
              <span className="k-n">{lost}</span>
              <span className="k-l">Discarded</span>
            </div>
          </div>
        </div>
        <div>
          <div className="k-rate">
            <span>
              <b>{pct(won)}%</b> success rate
            </span>
            <span className="k-pb" role="img" aria-label={`${won} success, ${open} open, ${lost} discarded out of ${total}`}>
              <i className="k-w" style={{ width: `${pct(won)}%` }} />
              <i className="k-o" style={{ width: `${pct(open)}%` }} />
              <i className="k-x" style={{ width: `${pct(lost)}%` }} />
            </span>
          </div>
          <div className="k-legend" aria-hidden="true">
            <span>
              <i style={{ background: "#2E8B57" }} />
              Success {won}
            </span>
            <span>
              <i style={{ background: "#C9A25E" }} />
              Open {open}
            </span>
            <span>
              <i style={{ background: "#C8B9B2" }} />
              Discarded {lost}
            </span>
          </div>
          {reasonCounts.length > 0 && (
            <div className="k-reasons" aria-label="Discard reasons">
              {reasonCounts.map((x) => (
                <span key={x.r} className="k-rchip">
                  {x.r} · {x.n}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      <nav className="k-colnav" aria-label="Board columns" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {stages.map(({ id: k, label }) => (
          <button key={k} type="button" className={col === k ? "k-cn k-on" : "k-cn"} aria-pressed={col === k} onClick={() => setCol(k)}>
            {label}
            <span className="k-c">{counts[k]}</span>
          </button>
        ))}
      </nav>

      <div className="k-board" style={{ "--n": stages.length } as React.CSSProperties} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {stages.map(({ id: k, label, hint }) => {
          const cards = by(k).sort((a, b) => ms(b.receivedAt) - ms(a.receivedAt));
          return (
            <section
              key={k}
              className={"k-col" + (col === k ? " k-cur" : "") + (over === k ? " k-over" : "")}
              aria-label={`${label}, ${cards.length}`}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                if (over !== k) setOver(k);
              }}
              onDragLeave={() => over === k && setOver("")}
              onDrop={(e) => {
                e.preventDefault();
                const id = dragId;
                setDragId("");
                setOver("");
                const l = leads.find((q) => q.id === id);
                if (!l || l.state.stage === k) return;
                if (k === "lost") {
                  setReason("");
                  setDNote("");
                  setSheet({ kind: "discard", id });
                } else moveTo(id, k);
              }}
            >
              <div className="k-colh">
                <b>{label}</b>
                <span className="k-c">{cards.length}</span>
              </div>
              <p className="k-colhint">{hint}</p>
              {cards.map((l) => {
                const nx = nextOf(stages, l.state.stage);
                const st = statusOf(l);
                return (
                  <article
                    key={l.id}
                    className={"k-lcard" + (l.state.stage === "lost" ? " k-lost" : "") + (dragId === l.id ? " k-drag" : "") + (flash === l.id ? " k-flash" : "")}
                    draggable
                    onDragStart={(e) => {
                      try {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", l.id);
                      } catch {}
                      setDragId(l.id);
                    }}
                    onDragEnd={() => {
                      setDragId("");
                      setOver("");
                    }}
                  >
                    <div className="k-ltop">
                      <button type="button" className="k-lname" onClick={() => setSheet({ kind: "detail", id: l.id })}>
                        {l.name}
                      </button>
                      <span className="k-age">{ago(l.receivedAt, now)}</span>
                    </div>
                    <div className="k-lmeta">{l.home}</div>
                    <div className="k-tags">
                      <span className="k-tag k-t-src">{l.src}</span>
                      {l.price && <span className="k-tag k-t-price">{l.price}</span>}
                      {st && <span className={st.cls}>{st.text}</span>}
                    </div>
                    <div className="k-lfoot">
                      {l.e164 && (
                        <>
                          <a className="k-ib" href={`tel:+${l.e164}`} aria-label={`Call ${l.name}`}>
                            <Phone />
                          </a>
                          <a className="k-ib" href={`sms:+${l.e164}`} aria-label={`Text ${l.name}`}>
                            <Bubble />
                          </a>
                        </>
                      )}
                      <button
                        type="button"
                        className="k-ib"
                        aria-label={`Move or discard ${l.name}`}
                        onClick={() => {
                          setPick("");
                          setSheet({ kind: "move", id: l.id });
                        }}
                      >
                        <Dots />
                      </button>
                      {nx && (
                        <button type="button" className={l.state.stage === "lost" ? "k-next k-out" : "k-next"} onClick={() => moveTo(l.id, nx[0])}>
                          {nx[1]}
                        </button>
                      )}
                      {l.state.stage === "won" && (
                        <Link className="k-next k-out" href={customerHref(l)}>
                          Customer page
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
              {!cards.length && <div className="k-empty">{k === "new" ? "All caught up. New quote requests land here." : k === "lost" ? "Nothing discarded." : "Nothing here right now."}</div>}
            </section>
          );
        })}
      </div>

      {sheet?.kind === "columns" && (
        <div className="k-sw" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
          <section className="k-sh" role="dialog" aria-modal="true" aria-label="Edit columns">
            <div className="k-grab" aria-hidden="true" />
            <div className="k-sh-h">
              <b style={{ fontSize: 17 }}>Edit columns</b>
              <button type="button" className="k-xbtn" aria-label="Close" onClick={() => setSheet(null)} autoFocus>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0E1F3D" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="k-sh-b">
              <p style={{ margin: 0, color: "#5B6474", fontSize: 15 }}>Rename any column. Add, remove or reorder the ones in between. The first column and Success and Discarded stay in place because the totals use them.</p>
              <ol className="k-cols">
                {draft.map((x, i) => {
                  const fixed = isFixed(x.id);
                  const canUp = !fixed && draft[i - 1] && !isFixed(draft[i - 1].id);
                  const canDown = !fixed && draft[i + 1] && !isFixed(draft[i + 1].id);
                  return (
                    <li key={x.id || `new-${i}`} className={fixed ? "k-crow k-fixed" : "k-crow"}>
                      <input
                        className="k-input k-cin"
                        value={x.label}
                        maxLength={MAX_LABEL}
                        placeholder="Column name"
                        aria-label={`Column ${i + 1} name`}
                        onChange={(e) => editDraft(i, e.target.value)}
                        autoFocus={!x.id && !x.label}
                      />
                      {fixed ? (
                        <span className="k-lock">{x.id === "new" ? "Stays first" : "Stays at the end"}</span>
                      ) : (
                        <span className="k-cbtns">
                          <button type="button" className="k-ib" aria-label={`Move ${x.label || "column"} up`} disabled={!canUp} onClick={() => moveDraft(i, -1)}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0E1F3D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
                          </button>
                          <button type="button" className="k-ib" aria-label={`Move ${x.label || "column"} down`} disabled={!canDown} onClick={() => moveDraft(i, 1)}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0E1F3D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                          </button>
                          <button type="button" className="k-ib k-del" aria-label={`Remove ${x.label || "column"}`} onClick={() => removeDraft(i)}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9A2A14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
              {draftMiddle < MAX_MIDDLE && (
                <button type="button" className="k-linkbtn" style={{ alignSelf: "flex-start" }} onClick={addDraft}>
                  + Add a column
                </button>
              )}
              {removedWithCards.length > 0 && (
                <p className="k-warn" style={{ margin: 0 }}>
                  {removedWithCards.map((x) => `${x.label} (${by(x.id).length})`).join(", ")}: cards in a removed column move to the column before it.
                </p>
              )}
              {(draftErr || err) && (
                <p className="k-warn k-err" role="alert" style={{ margin: 0 }}>
                  {draftErr || err}
                </p>
              )}
            </div>
            <div className="k-sh-f">
              <button type="button" className="k-btn" disabled={!!draftErr || busy} onClick={saveColumns}>
                {busy ? "Saving…" : "Save columns"}
              </button>
              <button type="button" className="k-linkbtn" onClick={() => setSheet(null)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {cur && sheet && sheet.kind !== "columns" && (
        <div className="k-sw" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
          <section className="k-sh" role="dialog" aria-modal="true" aria-label={sheet.kind === "move" ? "Move" : sheet.kind === "discard" ? "Discard" : "Submission"}>
            <div className="k-grab" aria-hidden="true" />
            <div className="k-sh-h">
              <b style={{ fontSize: 17 }}>{sheet.kind === "move" ? "Move" : sheet.kind === "discard" ? "Discard" : "Submission"}</b>
              <button type="button" className="k-xbtn" aria-label="Close" onClick={() => setSheet(null)} autoFocus>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0E1F3D" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {sheet.kind === "move" && (
              <>
                <div className="k-sh-b">
                  <p style={{ margin: 0, color: "#5B6474" }}>
                    Move <b style={{ color: "#0E1F3D" }}>{cur.name}</b> to:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="radiogroup" aria-label="Stage">
                    {stages.filter((x) => x.id !== "lost" && x.id !== cur.state.stage).map(({ id: k, label, hint }) => (
                      <button key={k} type="button" className={pick === k ? "k-stage k-sel" : "k-stage"} role="radio" aria-checked={pick === k} onClick={() => setPick(k)}>
                        {label}
                        <span className="k-c">{hint}</span>
                        {pick === k && (
                          <span className="k-tick" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0E1F3D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 12 5 5 9-10" />
                            </svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="k-sh-f">
                  <button type="button" className="k-btn" disabled={!pick || busy} onClick={() => pick && moveTo(cur.id, pick)}>
                    {pick ? `Move to ${stageName(stages, pick)}` : "Choose a stage"}
                  </button>
                  {cur.state.stage !== "lost" && (
                    <button
                      type="button"
                      className="k-linkbtn"
                      style={{ color: "#9A2A14" }}
                      onClick={() => {
                        setReason("");
                        setDNote("");
                        setSheet({ kind: "discard", id: cur.id });
                      }}
                    >
                      Discard this submission
                    </button>
                  )}
                </div>
              </>
            )}

            {sheet.kind === "discard" && (
              <>
                <div className="k-sh-b">
                  <p style={{ margin: 0, color: "#5B6474" }}>
                    Why are you discarding <b style={{ color: "#0E1F3D" }}>{cur.name}</b>?
                  </p>
                  <div className="k-chips" role="radiogroup" aria-label="Reason">
                    {REASONS.map((r) => (
                      <button key={r} type="button" className={reason === r ? "k-chip k-sel" : "k-chip"} role="radio" aria-checked={reason === r} onClick={() => setReason(r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <label>
                    <span className="k-lbl">
                      Note <span className="k-opt-lbl">(optional)</span>
                    </span>
                    <textarea className="k-input" placeholder="e.g. Asked for a commercial space" value={dNote} maxLength={300} onChange={(e) => setDNote(e.target.value)} />
                  </label>
                  <p style={{ margin: 0, fontSize: 14, color: "#5B6474" }}>You can restore it from the Discarded column anytime.</p>
                </div>
                <div className="k-sh-f">
                  <button type="button" className="k-btn k-btn-red" disabled={!reason || busy} onClick={() => reason && moveTo(cur.id, "lost", { reason, dNote: dNote.trim() })}>
                    Discard
                  </button>
                  <button type="button" className="k-linkbtn" onClick={() => setSheet(null)}>
                    Keep it
                  </button>
                </div>
              </>
            )}

            {sheet.kind === "detail" && (
              <>
                <div className="k-sh-b">
                  <div>
                    <h2 className="k-h2">{cur.name}</h2>
                    <div className="k-tags" style={{ marginTop: 6 }}>
                      <span className="k-tag k-t-src">{cur.src}</span>
                      <span className={cur.state.stage === "lost" ? "k-tag k-t-lost" : cur.state.stage === "won" ? "k-tag k-t-won" : "k-tag k-t-link"}>
                        {stageName(stages, cur.state.stage) + (cur.state.stage === "lost" && cur.state.reason ? ` · ${cur.state.reason}` : "")}
                      </span>
                    </div>
                  </div>
                  {cur.e164 && (
                    <div className="k-row">
                      <a className="k-npill" href={`tel:+${cur.e164}`}>
                        Call
                      </a>
                      <a className="k-npill" href={`sms:+${cur.e164}`}>
                        Text
                      </a>
                      <a className="k-npill" href={`https://wa.me/${cur.e164}`} target="_blank" rel="noopener">
                        WhatsApp
                      </a>
                    </div>
                  )}
                  {cur.address && (
                    <a className="k-addr" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cur.address)}`} target="_blank" rel="noopener">
                      {cur.address}
                    </a>
                  )}
                  <ul className="k-kv">
                    {cur.rows.map((r) => (
                      <li key={r.k}>
                        <span className="k-k">{r.k}</span>
                        <span className="k-v">{r.v}</span>
                      </li>
                    ))}
                  </ul>
                  <div>
                    <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>History</h3>
                    <ol className="k-tl">
                      {[{ at: cur.receivedAt, t: "Submitted the quote form" }, ...cur.state.hist].map((h, i) => (
                        <li key={i}>
                          <div className="k-d">{ago(h.at, now)}</div>
                          {h.t}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <div className="k-sh-f">
                  {nextOf(stages, cur.state.stage) && (
                    <button type="button" className="k-btn" disabled={busy} onClick={() => moveTo(cur.id, nextOf(stages, cur.state.stage)![0])}>
                      {nextOf(stages, cur.state.stage)![1]}
                    </button>
                  )}
                  <div className="k-row" style={{ justifyContent: "center", gap: 18 }}>
                    {cur.link ? (
                      <Link className="k-linkbtn" href={`/admin/links/${cur.link.id}`}>
                        Booking link · {cur.link.tag}
                      </Link>
                    ) : (
                      <Link className="k-linkbtn" href={`/admin/links/new?from=${cur.id}`}>
                        Create booking link
                      </Link>
                    )}
                    <button
                      type="button"
                      className="k-linkbtn"
                      onClick={() => {
                        setPick("");
                        setSheet({ kind: "move", id: cur.id });
                      }}
                    >
                      Move to another stage
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {toast && (
        <div className="k-toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button type="button" onClick={undo}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
