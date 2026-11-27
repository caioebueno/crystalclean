/**
 * PostHog: visitor analytics, quote funnel and session recordings.
 * Next.js runs this file in the browser before the app starts.
 *
 * - Events go through /ingest on this site (see next.config.ts), so fewer ad blockers drop them.
 * - Nothing is sent from /admin, or from booking pages opened from admin with ?preview=1.
 * - Recordings hide everything typed into fields. On booking pages, which show the
 *   customer's name and address, all text is hidden too.
 */
import posthog from "posthog-js";
import { POSTHOG_TOKEN } from "@/lib/analytics";

const path = window.location.pathname;
const isInternal = () =>
  window.location.pathname.startsWith("/admin") || new URLSearchParams(window.location.search).get("preview") === "1";

if (POSTHOG_TOKEN && !path.startsWith("/admin")) {
  posthog.init(POSTHOG_TOKEN, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
      ...(path.startsWith("/book") ? { maskTextSelector: "*" } : {}),
    },
    before_send: (event) => (isInternal() ? null : event),
  });
}
