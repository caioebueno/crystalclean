/** Meta (Facebook) Pixel. */
export const META_PIXEL_ID = "1802403317477629";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Send a standard Meta Pixel event, e.g. track("Lead"). Does nothing if the pixel is blocked. */
export const track = (event: string, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined") window.fbq?.("track", event, params);
};

/** Send a custom Meta Pixel event, e.g. trackCustom("QuoteStep", { step: 2 }). */
export const trackCustom = (event: string, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined") window.fbq?.("trackCustom", event, params);
};
