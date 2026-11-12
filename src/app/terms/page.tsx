import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of service", robots: { index: false } };

// TODO: replace with the real Terms of service before launch.
export default function Page() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "var(--font-dm), system-ui, sans-serif", color: "#0E1F3D" }}>
      <Link href="/" style={{ fontFamily: "var(--font-vibes), cursive", fontSize: 32, color: "#0E1F3D", textDecoration: "none" }}>
        Crystal Clean
      </Link>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 600, fontSize: 40 }}>Terms of service</h1>
      <p style={{ color: "#5B6474" }}>Coming soon.</p>
    </main>
  );
}
