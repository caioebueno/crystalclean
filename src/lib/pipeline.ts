/**
 * Where each quote request sits on the Submissions board (New → Contacted → Price sent → Success → Discarded).
 *
 * Stored apart from the submission itself, in one Redis hash keyed by submission id, so moving a
 * card never rewrites the submissions list. Without Redis it lives in memory, like submissions.
 */

import { redis, storageConfigured } from "@/lib/submissions";
import { autoName, priceLine, shownStatus, type BookingLink } from "@/lib/booking";

import { isStage, type HistItem, type PipeState } from "@/lib/pipelineStages";
export * from "@/lib/pipelineStages";

const KEY = "cc:pipeline";
const g = globalThis as unknown as { __ccPipe?: Map<string, string> };
const memory = (g.__ccPipe ??= new Map());

const parse = (raw: string | undefined | null): PipeState | undefined => {
  if (!raw) return undefined;
  try {
    const p = JSON.parse(raw) as PipeState;
    return isStage(p.stage) ? { ...p, hist: Array.isArray(p.hist) ? p.hist : [] } : undefined;
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
 */
export function effectiveState(saved: PipeState | undefined, link: BookingLink | undefined, receivedAt: string): PipeState {
  const booked = link && link.status === "booked";
  if (saved) {
    const bookedAfter = booked && saved.stage !== "won" && saved.stage !== "lost" && (link.bookedAt ?? link.updatedAt) > saved.updatedAt;
    if (bookedAfter) return { ...saved, stage: "won", note: linkNote(link), hist: [...saved.hist, { at: link.bookedAt ?? link.updatedAt, t: "Booked through the booking link" }] };
    if (link && saved.stage === "quoted" && (!saved.note || saved.note === "Price texted")) return { ...saved, note: linkNote(link) };
    return saved;
  }
  if (link && link.status !== "cancelled") {
    const hist: HistItem[] = [{ at: link.createdAt, t: "Booking link sent" }];
    if (booked) hist.push({ at: link.bookedAt ?? link.updatedAt, t: "Booked through the booking link" });
    return { stage: booked ? "won" : "quoted", note: linkNote(link), hist, updatedAt: link.updatedAt };
  }
  return { stage: "new", hist: [], updatedAt: receivedAt };
}
