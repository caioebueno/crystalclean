"use server";

import { isAdmin } from "@/lib/adminAuth";
import { FIXED_FIRST, LOST, REASONS, WON, getPipe, hasStage, linkStage, loadStages, normalizeStages, putPipe, saveStages, stageName, type PipeState, type StageDef } from "@/lib/pipeline";

type Res = { ok: true; state: PipeState } | { ok: false; error: string };
const signedOut = { ok: false as const, error: "You were signed out. Sign in again at /admin." };

/**
 * Move a quote request to another column. `from` is the state the board showed, saved first when
 * nothing was saved yet (e.g. a column that came from a booking link), so history isn't lost.
 */
export async function moveLeadAction(id: string, stage: string, from: PipeState, extra?: { reason?: string; dNote?: string }): Promise<Res> {
  if (!(await isAdmin())) return signedOut;
  let stages: StageDef[];
  try {
    stages = await loadStages();
  } catch (e) {
    console.error("[pipeline] stages load failed", e);
    return { ok: false, error: "Could not save. Check your connection and try again." };
  }
  if (typeof id !== "string" || !id || !hasStage(stages, stage)) return { ok: false, error: "That column no longer exists. Reload the page." };
  const reason = stage === LOST ? String(extra?.reason ?? "") : "";
  if (stage === LOST && !REASONS.includes(reason)) return { ok: false, error: "Pick a reason." };
  const dNote = stage === LOST ? String(extra?.dNote ?? "").trim().slice(0, 300) : "";
  try {
    const base = (await getPipe(id)) ?? {
      stage: typeof from?.stage === "string" ? from.stage : FIXED_FIRST,
      note: typeof from?.note === "string" ? from.note.slice(0, 120) : undefined,
      hist: Array.isArray(from?.hist) ? from.hist.slice(-30).map((h) => ({ at: String(h.at), t: String(h.t).slice(0, 200) })) : [],
      updatedAt: new Date(0).toISOString(),
    };
    const now = new Date().toISOString();
    const restored = base.stage === LOST && stage === FIXED_FIRST;
    const sent = linkStage(stages);
    const note =
      stage === WON ? (base.note && base.stage === WON ? base.note : "Booked") : stage === sent ? (base.note && base.stage === sent ? base.note : "Price texted") : undefined;
    const next: PipeState = {
      stage,
      note,
      reason: reason || undefined,
      dNote: dNote || undefined,
      hist: [...base.hist, { at: now, t: stage === LOST ? `Discarded: ${reason}${dNote ? ` (${dNote})` : ""}` : restored ? `Restored to ${stageName(stages, FIXED_FIRST)}` : `Moved to ${stageName(stages, stage)}` }].slice(-30),
      updatedAt: now,
    };
    await putPipe(id, next);
    return { ok: true, state: next };
  } catch (e) {
    console.error("[pipeline] move failed", e);
    return { ok: false, error: "Could not save. Check your connection and try again." };
  }
}

/** Undo: put back exactly what was saved before (or nothing, when the card had no saved column). */
export async function restoreLeadAction(id: string, prev: PipeState | null): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return signedOut;
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing request." };
  if (prev && typeof prev.stage !== "string") return { ok: false, error: "Unknown column." };
  try {
    await putPipe(id, prev);
    return { ok: true };
  } catch (e) {
    console.error("[pipeline] undo failed", e);
    return { ok: false, error: "Could not undo. Try again." };
  }
}

/** Save renamed, added, removed or reordered columns. Cards in a removed column move one column left. */
export async function saveStagesAction(input: unknown): Promise<{ ok: true; stages: StageDef[]; moved: number } | { ok: false; error: string }> {
  if (!(await isAdmin())) return signedOut;
  const next = normalizeStages(input, () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
  if (typeof next === "string") return { ok: false, error: next };
  try {
    const prev = await loadStages();
    const moved = await saveStages(next, prev);
    return { ok: true, stages: next, moved };
  } catch (e) {
    console.error("[pipeline] stages save failed", e);
    return { ok: false, error: "Could not save the columns. Try again." };
  }
}
