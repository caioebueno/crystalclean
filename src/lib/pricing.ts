/**
 * Starting ("from") prices shown on the quote form. Kyle texts the exact price.
 * One number is shown at a time: the price for the chosen frequency (homes), per turnover
 * (rentals), or the one-time deep clean on the holiday deep-clean page.
 * Index = bedrooms (0 = studio). 5+ bedrooms: no number, "Exact price by text".
 *
 * The numbers below are only the defaults. Admin → Prices saves an edited copy in Redis
 * (src/lib/priceStore.ts) and the quote page uses that copy when there is one.
 */
export type PriceKind = "weekly" | "biweekly" | "monthly" | "once" | "deep" | "rental";

export const PRICE_KINDS: { k: PriceKind; label: string; help: string }[] = [
  { k: "weekly", label: "Every week", help: "Home, cleaned every week. Price per clean." },
  { k: "biweekly", label: "Every 2 weeks", help: "Home, cleaned every 2 weeks. Preselected on the form." },
  { k: "monthly", label: "Monthly", help: "Home, cleaned once a month. Price per clean." },
  { k: "once", label: "One time", help: "Home, a single standard clean." },
  { k: "deep", label: "Holiday deep clean", help: "Shown on the deep-clean ad page only." },
  { k: "rental", label: "Vacation rental", help: "Price per turnover." },
];

export const MAX_PRICED_BEDS = 4;
export const BED_LABELS = ["Studio", "1 bed", "2 beds", "3 beds", "4 beds"];

export type PriceTable = {
  /** Starting price by bedrooms, index 0 = studio … 4 = 4 beds. */
  from: Record<PriceKind, number[]>;
  /** Added for each full bathroom above 2. */
  bathStep: Record<PriceKind, number>;
};

export const DEFAULT_PRICES: PriceTable = {
  from: {
    weekly: [89, 89, 109, 135, 159],
    biweekly: [99, 99, 119, 149, 179],
    monthly: [119, 119, 145, 179, 215],
    once: [125, 125, 149, 189, 225],
    deep: [149, 149, 179, 225, 269],
    rental: [89, 89, 109, 135, 159],
  },
  bathStep: { weekly: 9, biweekly: 10, monthly: 12, once: 13, deep: 15, rental: 10 },
};

export function startingPrice(kind: PriceKind, beds: number, baths: number, table: PriceTable = DEFAULT_PRICES): number | null {
  if (beds > MAX_PRICED_BEDS) return null;
  const base = table.from[kind][Math.max(0, beds)];
  return base + Math.max(0, Math.floor(baths) - 2) * table.bathStep[kind];
}

const okPrice = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;

/** Fills anything missing or broken from the defaults, so a bad saved copy can never break the form. */
export function normalizePrices(raw: unknown): PriceTable {
  const r = (raw ?? {}) as Partial<PriceTable>;
  const out: PriceTable = { from: { ...DEFAULT_PRICES.from }, bathStep: { ...DEFAULT_PRICES.bathStep } };
  for (const { k } of PRICE_KINDS) {
    const row = r.from?.[k];
    out.from[k] = DEFAULT_PRICES.from[k].map((d, i) => (Array.isArray(row) && okPrice(row[i], 5000) ? Math.round(row[i]) : d));
    const step = r.bathStep?.[k];
    out.bathStep[k] = okPrice(step, 1000) ? Math.round(step as number) : DEFAULT_PRICES.bathStep[k];
  }
  return out;
}
