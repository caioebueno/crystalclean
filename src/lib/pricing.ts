/**
 * Starting ("from") prices shown on the quote form. Kyle texts the exact price.
 * One teaser number only: every 2 weeks for homes, per turnover for rentals,
 * one-time deep clean on the holiday deep-clean page.
 * Index = bedrooms (0 = studio). 5+ bedrooms: no number, "Exact price by text".
 * Full grid with weekly, monthly and first-visit prices: website/claude-design-short-quote-prompt.md in the project files.
 */
export type PriceKind = "biweekly" | "deep" | "rental";

const FROM: Record<PriceKind, number[]> = {
  biweekly: [99, 99, 119, 149, 179],
  deep: [149, 149, 179, 225, 269],
  rental: [89, 89, 109, 135, 159],
};
/** Each full bathroom above 2 adds $10 (times 1.5 for a deep clean). */
const BATH_STEP: Record<PriceKind, number> = { biweekly: 10, deep: 15, rental: 10 };

export const MAX_PRICED_BEDS = 4;

export function startingPrice(kind: PriceKind, beds: number, baths: number): number | null {
  if (beds > MAX_PRICED_BEDS) return null;
  const base = FROM[kind][Math.max(0, beds)];
  return base + Math.max(0, Math.floor(baths) - 2) * BATH_STEP[kind];
}
