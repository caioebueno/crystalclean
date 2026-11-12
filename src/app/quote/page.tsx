import type { Metadata } from "next";
import { Suspense } from "react";
import { QuoteFlow } from "@/components/quote/QuoteFlow";
import "./qp.css";

export const metadata: Metadata = {
  title: "Get your free quote",
  description: "Tell us about your home in about 2 minutes and get your exact cleaning price by text. No contracts.",
  robots: { index: false, follow: true },
};

export default function QuotePage() {
  return (
    <Suspense>
      <QuoteFlow />
    </Suspense>
  );
}
