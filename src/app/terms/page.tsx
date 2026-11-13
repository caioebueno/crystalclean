import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";
import { site, callHref } from "@/config/site";

export const metadata: Metadata = { title: "Terms of service" };

export default function Page() {
  return (
    <LegalPage title="Terms of service" updated="November 13, 2026">
      <p>These terms apply to your use of this website and to quote requests you send through it.</p>

      <h2>Quotes</h2>
      <p>
        Requesting a quote is free and does not commit you to book. Your price is based on the details you give us. If the home is very different from what was
        described, we will talk with you about the price before we start.
      </p>

      <h2>Bookings</h2>
      <p>A booking is confirmed only when we confirm the date and price with you by text or phone. The specific terms of your service are the ones we agree with you then.</p>

      <h2>Texts and calls</h2>
      <p>By sending a quote request or joining the waitlist, you agree that we can text or call the number you give us about your request and your service. Message and data rates may apply. Reply STOP to stop texts at any time.</p>

      <h2>Website content</h2>
      <p>We work to keep the information on this site accurate, but services, service areas and availability can change. Photos on this site may be illustrative.</p>

      <h2>Privacy</h2>
      <p>
        How we handle your information is described in our <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Contact us</h2>
      <p>
        {site.name}, Orlando, Florida. Call or text <a href={callHref}>{site.phoneDisplay}</a>.
      </p>
    </LegalPage>
  );
}
