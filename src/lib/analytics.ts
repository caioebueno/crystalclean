/** PostHog events, sent next to the Meta Pixel events in src/lib/fbq.ts. */
import posthog from "posthog-js";

// The project token is public by design (it only allows sending events), so a default is fine here.
export const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || "phc_ufVkiT6ZujZXdWeWtf22gCSeMRRAYbZUN4M9wcy65scM";

/** Send a PostHog event. Does nothing on the server, if PostHog isn't loaded, or if it's blocked. */
export const capture = (event: string, props?: Record<string, unknown>) => {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* never break the page for analytics */
  }
};
