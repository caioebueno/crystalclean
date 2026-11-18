/**
 * Starting ("from") prices shown on the quote form. Kyle texts the exact price.
 * One number is shown at a time: the price for the chosen frequency (homes), per turnover
 * (rentals), or the one-time deep clean on the holiday deep-clean page.
 * Index = bedrooms (0 = studio). 5+ bedrooms: no number, "Exact price by text".
 * Full grid: website/claude-design-short-quote-prompt.md in the project files.
 */
export type PriceKind = "weekly" | "biweekly" | "monthly" | "once" | "deep" | "rental";

const FROM: Record<PriceKind, number[]> = {
  weekly: [89, 89, 109, 135, 159],
  biweekly: [99, 99, 119, 149, 179],
  monthly: [119, 119, 145, 179, 215],
  once: [125, 125, 149, 189, 225],
  deep: [149, 149, 179, 225, 269],
  rental: [89, 89, 109, 135, 159],
};
/** Each full bathroom above 2 adds $10 on the every-2-weeks price, scaled by the same multiplier. */
const BATH_STEP: Record<PriceKind, number> = { weekly: 9, biweekly: 10, monthly: 12, once: 13, deep: 15, rental: 10 };

export const MAX_PRICED_BEDS = 4;

export function startingPrice(kind: PriceKind, beds: number, baths: number): number | null {
  if (beds > MAX_PRICED_BEDS) return null;
  const base = FROM[kind][Math.max(0, beds)];
  return base + Math.max(0, Math.floor(baths) - 2) * BATH_STEP[kind];
}
