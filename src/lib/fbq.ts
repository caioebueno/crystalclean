/** Meta (Facebook) Pixel. Each event is also sent to PostHog under a readable name. */
import { capture } from "@/lib/analytics";

export const META_PIXEL_ID = "1802403317477629";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** PostHog names for the Meta events. */
const POSTHOG_NAMES: Record<string, string> = {
  ViewContent: "quote form opened",
  QuoteStep: "quote step reached",
  Lead: "quote sent",
  CompleteRegistration: "quote details sent",
  Waitlist: "waitlist joined",
  Contact: "contact tapped",
};

const toPostHog = (event: string, params?: Record<string, unknown>) => capture(POSTHOG_NAMES[event] || event, params);

/** Send a standard Meta Pixel event, e.g. track("Lead"). Does nothing if the pixel is blocked. */
export const track = (event: string, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined") window.fbq?.("track", event, params);
  toPostHog(event, params);
};

/** Send a custom Meta Pixel event, e.g. trackCustom("QuoteStep", { step: 2 }). */
export const trackCustom = (event: string, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined") window.fbq?.("trackCustom", event, params);
  toPostHog(event, params);
};
