/**
 * Where each quote request sits on the Submissions board (New → Contacted → Price sent → Success → Discarded).
 *
 * Stored apart from the submission itself, in one Redis hash keyed by submission id, so moving a
 * card never rewrites the submissions list. Without Redis it lives in memory, like submissions.
 */

import { redis, storageConfigured } from "@/lib/submissions";
import { autoName, priceLine, shownStatus, type BookingLink } from "@/lib/booking";

import { DEFAULT_STAGES, FIXED_FIRST, LOST, WON, hasStage, linkStage, type HistItem, type PipeState, type StageDef } from "@/lib/pipelineStages";
export * from "@/lib/pipelineStages";

const KEY = "cc:pipeline";
const STAGES_KEY = "cc:pipeline:stages";
const g = globalThis as unknown as { __ccPipe?: Map<string, string>; __ccStages?: string };
const memory = (g.__ccPipe ??= new Map());

/** The board's columns, in order. Falls back to the defaults until they're edited. */
export async function loadStages(): Promise<StageDef[]> {
  const raw = storageConfigured ? await redis<string | null>(["GET", STAGES_KEY]) : g.__ccStages;
  if (!raw) return DEFAULT_STAGES;
  try {
    const list = JSON.parse(raw) as StageDef[];
    return Array.isArray(list) && list.length >= 3 ? list : DEFAULT_STAGES;
  } catch {
    return DEFAULT_STAGES;
  }
}

/**
 * Save edited columns. Cards in a removed column move to the column that was just before it
 * (or the first column), with a line in their history.
 */
export async function saveStages(next: StageDef[], prev: StageDef[]): Promise<number> {
  const raw = JSON.stringify(next);
  if (storageConfigured) await redis(["SET", STAGES_KEY, raw]);
  else g.__ccStages = raw;
  const gone = prev.filter((s) => !hasStage(next, s.id));
  if (!gone.length) return 0;
  const target = (id: string) => {
    for (let i = prev.findIndex((s) => s.id === id) - 1; i >= 0; i--) if (hasStage(next, prev[i].id)) return next.find((s) => s.id === prev[i].id)!;
    return next[0];
  };
  const all = await loadPipeline();
  const now = new Date().toISOString();
  let moved = 0;
  for (const [id, p] of Object.entries(all)) {
    const old = gone.find((s) => s.id === p.stage);
    if (!old) continue;
    const to = target(old.id);
    await putPipe(id, { ...p, stage: to.id, hist: [...p.hist, { at: now, t: `Column "${old.label}" removed, moved to ${to.label}` }].slice(-30), updatedAt: now });
    moved++;
  }
  return moved;
}

const parse = (raw: string | undefined | null): PipeState | undefined => {
  if (!raw) return undefined;
  try {
    const p = JSON.parse(raw) as PipeState;
    return typeof p.stage === "string" && p.stage ? { ...p, hist: Array.isArray(p.hist) ? p.hist : [] } : undefined;
  } catch {
    return undefined;
  }
};

export async function loadPipeline(): Promise<Record<string, PipeState>> {
  const out: Record<string, PipeState> = {};
  if (storageConfigured) {
    const flat = (await redis<string[] | Record<string, string>>(["HGETALL", KEY])) ?? [];
    // Upstash REST returns [k, v, k, v]; node-redis sendCommand returns the same flat list.
    const pairs: [string, string][] = Array.isArray(flat)
      ? Array.from({ length: Math.floor(flat.length / 2) }, (_, i) => [flat[i * 2], flat[i * 2 + 1]])
      : Object.entries(flat);
    for (const [k, v] of pairs) {
      const p = parse(v);
      if (p) out[k] = p;
    }
  } else {
    for (const [k, v] of memory) {
      const p = parse(v);
      if (p) out[k] = p;
    }
  }
  return out;
}

export async function getPipe(id: string): Promise<PipeState | undefined> {
  return parse(storageConfigured ? await redis<string | null>(["HGET", KEY, id]) : memory.get(id));
}

export async function putPipe(id: string, p: PipeState | null): Promise<void> {
  if (storageConfigured) {
    if (p) await redis(["HSET", KEY, id, JSON.stringify(p)]);
    else await redis(["HDEL", KEY, id]);
  } else if (p) memory.set(id, JSON.stringify(p));
  else memory.delete(id);
}

const linkNote = (l: BookingLink) => {
  if (l.status === "booked") {
    const o = l.options.find((x) => x.id === l.picked);
    return o ? `${o.name || autoName(o)} · ${priceLine(o)}` : "Booked";
  }
  const st = shownStatus(l);
  return st === "viewed" ? "Link viewed" : st === "expired" ? "Link expired" : st === "cancelled" ? "Link cancelled" : "Booking link sent";
};

/**
 * The stage a request shows. A saved move wins, except that a booking link booked after the last
 * move counts as Success. With no saved move, a booking link means Price sent (or Success once booked).
 * "Price sent" is whichever column linkStage() picks, in case it was renamed or removed.
 */
export function effectiveState(stages: StageDef[], saved: PipeState | undefined, link: BookingLink | undefined, receivedAt: string): PipeState {
  const booked = link && link.status === "booked";
  const sent = linkStage(stages);
  // A column that no longer exists (shouldn't happen: removing one moves its cards) shows in the first column.
  if (saved && !hasStage(stages, saved.stage)) saved = { ...saved, stage: FIXED_FIRST };
  if (saved) {
    const bookedAfter = booked && saved.stage !== WON && saved.stage !== LOST && (link.bookedAt ?? link.updatedAt) > saved.updatedAt;
    if (bookedAfter) return { ...saved, stage: WON, note: linkNote(link), hist: [...saved.hist, { at: link.bookedAt ?? link.updatedAt, t: "Booked through the booking link" }] };
    if (link && saved.stage === sent && (!saved.note || saved.note === "Price texted")) return { ...saved, note: linkNote(link) };
    return saved;
  }
  if (link && link.status !== "cancelled") {
    const hist: HistItem[] = [{ at: link.createdAt, t: "Booking link sent" }];
    if (booked) hist.push({ at: link.bookedAt ?? link.updatedAt, t: "Booked through the booking link" });
    return { stage: booked ? WON : sent, note: linkNote(link), hist, updatedAt: link.updatedAt };
  }
  return { stage: FIXED_FIRST, hist: [], updatedAt: receivedAt };
}
