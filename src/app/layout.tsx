import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, Great_Vibes } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm", subsets: ["latin"], weight: ["400", "500", "700"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});
const vibes = Great_Vibes({ variable: "--font-vibes", subsets: ["latin"], weight: "400" });

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
      <body className={`${dmSans.variable} ${cormorant.variable} ${vibes.variable}`}>{children}</body>
    </html>
  );
}
