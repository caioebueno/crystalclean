/** Board columns and the saved state of a card. Safe to import in client code (no storage). */

/**
 * A column id. Three are fixed and always there: "new" (first), "won" and "lost" (last two). They can be
 * renamed but not removed or moved, because the totals and booking links depend on them. Every column
 * in between can be renamed, added, removed and reordered.
 */
export type Stage = string;
export type StageDef = { id: Stage; label: string; hint: string };

export const FIXED_FIRST = "new";
export const WON = "won";
export const LOST = "lost";
export const isFixed = (id: Stage) => id === FIXED_FIRST || id === WON || id === LOST;

export const DEFAULT_STAGES: StageDef[] = [
  { id: "new", label: "New", hint: "Not contacted yet" },
  { id: "contacted", label: "Contacted", hint: "You reached out" },
  { id: "quoted", label: "Price sent", hint: "Waiting for a yes" },
  { id: "won", label: "Success", hint: "Booked" },
  { id: "lost", label: "Discarded", hint: "Not moving forward" },
];
export const MAX_MIDDLE = 8;
export const MAX_LABEL = 24;

export const REASONS = ["No answer", "Too expensive", "Out of area", "Not a fit", "Spam"];

export const hasStage = (stages: StageDef[], s: unknown): s is Stage => typeof s === "string" && stages.some((x) => x.id === s);
export const stageName = (stages: StageDef[], k: Stage) => stages.find((x) => x.id === k)?.label ?? k;

/** Where a request with a booking link lands: "Price sent" while that column exists, else the last column before Success. */
export function linkStage(stages: StageDef[]): Stage {
  if (hasStage(stages, "quoted")) return "quoted";
  const mid = stages.filter((s) => !isFixed(s.id));
  return mid.length ? mid[mid.length - 1].id : FIXED_FIRST;
}

const DEFAULT_NEXT: Record<string, string> = { contacted: "Mark contacted", quoted: "Price sent", won: "Mark booked" };

/** The card's one-tap next step: the next column to the right (Discarded goes back to the first). */
export function nextOf(stages: StageDef[], k: Stage): [Stage, string] | undefined {
  if (k === LOST) return [FIXED_FIRST, "Restore"];
  if (k === WON) return undefined;
  const i = stages.findIndex((s) => s.id === k);
  const to = stages[i + 1];
  if (!to || to.id === LOST) return undefined;
  const def = DEFAULT_STAGES.find((d) => d.id === to.id);
  const label = def && def.label === to.label && DEFAULT_NEXT[to.id] ? DEFAULT_NEXT[to.id] : `Move to ${to.label}`;
  return [to.id, label];
}

/**
 * Check a column list sent by the editor. New columns come with an empty id and get one here.
 * Returns the cleaned list, or an error to show.
 */
export function normalizeStages(input: unknown, makeId: () => string): StageDef[] | string {
  if (!Array.isArray(input)) return "Something went wrong. Reload and try again.";
  const out: StageDef[] = [];
  const seen = new Set<string>();
  for (const raw of input.slice(0, MAX_MIDDLE + 3)) {
    const r = (raw ?? {}) as Partial<StageDef>;
    const label = String(r.label ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LABEL);
    if (!label) return "Every column needs a name.";
    let id = typeof r.id === "string" ? r.id.trim().slice(0, 40) : "";
    if (!id || seen.has(id)) id = makeId();
    seen.add(id);
    out.push({ id, label, hint: String(r.hint ?? "").trim().slice(0, 60) });
  }
  if (out[0]?.id !== FIXED_FIRST) return "The first column has to stay first.";
  if (out[out.length - 2]?.id !== WON || out[out.length - 1]?.id !== LOST) return "Success and Discarded have to stay the last two columns.";
  if (out.length - 3 > MAX_MIDDLE) return `You can have up to ${MAX_MIDDLE} columns in between.`;
  const labels = out.map((s) => s.label.toLowerCase());
  if (new Set(labels).size !== labels.length) return "Two columns have the same name.";
  return out;
}

export type HistItem = { at: string; t: string };
export type PipeState = {
  stage: Stage;
  /** Short status shown on the card, e.g. "Booking link sent" or "Monthly · $179 per clean". */
  note?: string;
  /** Discarded only. */
  reason?: string;
  dNote?: string;
  hist: HistItem[];
  updatedAt: string;
};
