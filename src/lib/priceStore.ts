/**
 * Quote form prices edited in Admin → Prices. Same Redis as the form submissions
 * (see submissions.ts), one JSON string at `cc:prices`. Nothing saved = the defaults
 * in pricing.ts. Without Redis, kept in memory.
 */
import { redis, storageConfigured } from "@/lib/submissions";
import { DEFAULT_PRICES, normalizePrices, type PriceTable } from "@/lib/pricing";

const KEY = "cc:prices";
const g = globalThis as unknown as { __ccPrices?: string };

export type SavedPrices = { prices: PriceTable; updatedAt?: string; custom: boolean };

export async function getPrices(): Promise<SavedPrices> {
  let raw: unknown;
  try {
    raw = storageConfigured ? await redis<string | null>(["GET", KEY]) : g.__ccPrices;
  } catch (e) {
    console.error("[prices] load failed, using defaults", e);
    return { prices: DEFAULT_PRICES, custom: false };
  }
  if (typeof raw !== "string") return { prices: DEFAULT_PRICES, custom: false };
  try {
    const j = JSON.parse(raw) as { prices?: unknown; updatedAt?: string };
    return { prices: normalizePrices(j.prices), updatedAt: j.updatedAt, custom: true };
  } catch {
    return { prices: DEFAULT_PRICES, custom: false };
  }
}

export async function putPrices(prices: PriceTable) {
  const raw = JSON.stringify({ prices: normalizePrices(prices), updatedAt: new Date().toISOString() });
  if (storageConfigured) await redis(["SET", KEY, raw]);
  else g.__ccPrices = raw;
  console.log("[prices]", raw); // backup copy in the Vercel logs
}

export async function resetPrices() {
  if (storageConfigured) await redis(["DEL", KEY]);
  else g.__ccPrices = undefined;
  console.log("[prices] reset to defaults");
}
