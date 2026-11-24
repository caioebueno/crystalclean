"use server";

import { isAdmin } from "@/lib/adminAuth";
import { getPipe, isStage, putPipe, REASONS, stageName, type PipeState } from "@/lib/pipeline";

type Res = { ok: true; state: PipeState } | { ok: false; error: string };
const signedOut = { ok: false as const, error: "You were signed out. Sign in again at /admin." };

/**
 * Move a quote request to another stage. `from` is the state the board showed, saved first when
 * nothing was saved yet (e.g. a stage that came from a booking link), so history isn't lost.
 */
export async function moveLeadAction(id: string, stage: string, from: PipeState, extra?: { reason?: string; dNote?: string }): Promise<Res> {
  if (!(await isAdmin())) return signedOut;
  if (typeof id !== "string" || !id || !isStage(stage)) return { ok: false, error: "Unknown stage." };
  const reason = stage === "lost" ? String(extra?.reason ?? "") : "";
  if (stage === "lost" && !REASONS.includes(reason)) return { ok: false, error: "Pick a reason." };
  const dNote = stage === "lost" ? String(extra?.dNote ?? "").trim().slice(0, 300) : "";
  try {
    const base = (await getPipe(id)) ?? {
      stage: isStage(from?.stage) ? from.stage : "new",
      note: typeof from?.note === "string" ? from.note.slice(0, 120) : undefined,
      hist: Array.isArray(from?.hist) ? from.hist.slice(-30).map((h) => ({ at: String(h.at), t: String(h.t).slice(0, 200) })) : [],
      updatedAt: new Date(0).toISOString(),
    };
    const now = new Date().toISOString();
    const restored = base.stage === "lost" && stage === "new";
    const note = stage === "won" ? base.note && base.stage === "won" ? base.note : "Booked" : stage === "quoted" ? base.note && base.stage === "quoted" ? base.note : "Price texted" : undefined;
    const next: PipeState = {
      stage,
      note,
      reason: reason || undefined,
      dNote: dNote || undefined,
      hist: [...base.hist, { at: now, t: stage === "lost" ? `Discarded: ${reason}${dNote ? ` (${dNote})` : ""}` : restored ? "Restored to New" : `Moved to ${stageName(stage)}` }].slice(-30),
      updatedAt: now,
    };
    await putPipe(id, next);
    return { ok: true, state: next };
  } catch (e) {
    console.error("[pipeline] move failed", e);
    return { ok: false, error: "Could not save. Check your connection and try again." };
  }
}

/** Undo: put back exactly what was saved before (or nothing, when the card had no saved stage). */
export async function restoreLeadAction(id: string, prev: PipeState | null): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return signedOut;
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing request." };
  if (prev && !isStage(prev.stage)) return { ok: false, error: "Unknown stage." };
  try {
    await putPipe(id, prev);
    return { ok: true };
  } catch (e) {
    console.error("[pipeline] undo failed", e);
    return { ok: false, error: "Could not undo. Try again." };
  }
}
