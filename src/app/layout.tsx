import type { Metadata, Viewport } from "next";
// Fonts are bundled (no download at build time): DM Sans, Cormorant Garamond, Great Vibes.
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-700.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/great-vibes/latin-400.css";
import { site } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "House Cleaning Orlando & Airbnb Cleaning | Crystal Clean",
    template: "%s | Crystal Clean",
  },
  description:
    "Orlando house cleaning and Airbnb / VRBO turnover cleaning. Get your exact price by text. No contracts, the same trusted team every visit. Fully insured.",
  keywords: [
    "house cleaning Orlando",
    "Airbnb cleaning Orlando",
    "vacation rental cleaning Orlando",
    "maid service Orlando",
    "deep cleaning Orlando",
    "move out cleaning Orlando",
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "Crystal Clean | Orlando home & vacation rental cleaning",
    description:
      "Your exact cleaning price, by text. No contracts. The same trusted team every visit.",
    images: ["/images/design/hero.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0E1F3D",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
