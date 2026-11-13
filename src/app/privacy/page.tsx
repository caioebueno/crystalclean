import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { site, callHref } from "@/config/site";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <LegalPage title="Privacy policy" updated="November 13, 2026">
      <p>
        This policy explains what information {site.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), a home and vacation rental cleaning business in the Orlando, Florida area,
        collects through this website and how we use it.
      </p>

      <h2>Information you give us</h2>
      <p>When you request a quote, we collect your name, mobile number, service address, ZIP code, details about your home (such as bedrooms, bathrooms and size), the
        service and schedule you prefer, and any notes you add. If you join our waitlist, we collect your ZIP code and mobile number.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To prepare your price, contact you about your quote and schedule and provide your cleaning.</li>
        <li>To text or call you about your request and your appointments. Message and data rates may apply. Reply STOP to stop texts at any time.</li>
        <li>To run and improve our business and this website, and to measure how well our ads work.</li>
      </ul>

      <h2>Cookies and the Meta Pixel</h2>
      <p>
        This website uses the Meta Pixel, a tool from Meta Platforms, Inc. (Facebook and Instagram). It uses cookies and similar technologies to record actions on
        this site, such as visiting a page or sending a quote request, together with technical information like your IP address, browser and device. Meta uses this
        to help us measure our ads and show them to people who may be interested, and may combine it with information it already has, under{" "}
        <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Meta&rsquo;s privacy policy</a>. We do not send the details you
        type into the quote form (such as your name, phone or address) to Meta.
      </p>
      <p>
        You can control how Meta uses this information for ads in your{" "}
        <a href="https://www.facebook.com/adpreferences/" target="_blank" rel="noopener noreferrer">Facebook ad preferences</a>, and you can block or delete cookies in
        your browser settings.
      </p>

      <h2>Sharing</h2>
      <p>
        We do not sell your personal information. We share it only with service providers that help us run this website and our business (for example website
        hosting, data storage and text messaging), with Meta as described above, or when the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>We keep quote and customer information for as long as we need it to serve you and to keep business records, and then delete it.</p>

      <h2>Your choices</h2>
      <p>You can ask us to see, correct or delete the information we hold about you by contacting us below.</p>

      <h2>Children</h2>
      <p>This website is not intended for children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we will post the new version on this page with a new date.</p>

      <h2>Contact us</h2>
      <p>
        {site.name}, Orlando, Florida. Call or text <a href={callHref}>{site.phoneDisplay}</a>.
      </p>
    </LegalPage>
  );
}
