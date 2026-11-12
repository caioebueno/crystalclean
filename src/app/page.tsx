import Landing from "@/components/Landing";
import { site } from "@/config/site";
import "./lp.css";

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    description: "House cleaning and vacation rental turnover cleaning in the Orlando, Florida area.",
    url: site.url,
    telephone: site.phoneE164,
    areaServed: site.cities.map((c) => ({ "@type": "City", name: `${c}, FL` })),
    sameAs: [`https://instagram.com/${site.instagram}`],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Landing />
    </>
  );
}
