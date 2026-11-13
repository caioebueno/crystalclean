import Link from "next/link";
import { site } from "@/config/site";

/** Simple shared layout for the privacy and terms pages. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px", fontFamily: "var(--font-dm), system-ui, sans-serif", color: "#0E1F3D", lineHeight: 1.6, fontSize: 17 }}>
      <Link href="/" style={{ fontFamily: "var(--font-vibes), cursive", fontSize: 32, color: "#0E1F3D", textDecoration: "none" }}>
        {site.name}
      </Link>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 600, fontSize: 40, lineHeight: 1.15, margin: "24px 0 4px" }}>{title}</h1>
      <p style={{ color: "#5B6474", marginTop: 0 }}>Last updated {updated}</p>
      <div className="legal">{children}</div>
    </main>
  );
}
