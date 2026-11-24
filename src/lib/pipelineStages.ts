/** Board stages and the saved state of a card. Safe to import in client code (no storage). */

export type Stage = "new" | "contacted" | "quoted" | "won" | "lost";
export const STAGES: [Stage, string, string][] = [
  ["new", "New", "Not contacted yet"],
  ["contacted", "Contacted", "You reached out"],
  ["quoted", "Price sent", "Waiting for a yes"],
  ["won", "Success", "Booked"],
  ["lost", "Discarded", "Not moving forward"],
];
export const REASONS = ["No answer", "Too expensive", "Out of area", "Not a fit", "Spam"];
export const isStage = (s: unknown): s is Stage => STAGES.some((x) => x[0] === s);
export const stageName = (k: Stage) => STAGES.find((x) => x[0] === k)?.[1] ?? k;

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
