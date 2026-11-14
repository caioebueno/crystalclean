import type { Metadata } from "next";
import Link from "next/link";
import { Bubble, Roofline } from "@/components/brand";
import ReviewCard from "@/components/ReviewCard";
import { reviews } from "@/content/reviews";
import { site, textUsHref } from "@/config/site";
import "../lp.css";

export const metadata: Metadata = {
  title: "Customer reviews",
  description: "What Orlando customers say about Crystal Clean house, move-out and office cleaning, in their own words.",
  alternates: { canonical: "/testimonials" },
};

export default function TestimonialsPage() {
  return (
    <div className="lp" id="top">
      <div className="topbar">
        Free quote · <b>Exact price by text</b> · Flexible plans
      </div>
      <header className="hdr">
        <div className="wrap hdr-in">
          <Link href="/" className="logo" aria-label="Crystal Clean, home">
            <Roofline width={130} height={16} stroke={5} />
            <span className="logo-word">Crystal Clean</span>
          </Link>
          <div className="hdr-r">
            <a className="txt-link" href={textUsHref}>
              <Bubble size={20} w={1.7} dash={false} />
              <span className="tl-l">Text us</span>
            </a>
            <Link className="btn btn-sm" href="/quote">
              Get my free quote
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="sec" aria-labelledby="rev-h">
          <div className="wrap">
            <div className="center">
              <p className="eyebrow">Testimonials</p>
              <h1 className="h2" id="rev-h">
                What our clients say
              </h1>
              <p className="lede">Reviews from Crystal Clean customers around Orlando, in their own words.</p>
            </div>
            <div className="rev-grid">
              {reviews.map((r) => (
                <ReviewCard review={r} key={r.name} />
              ))}
            </div>
            <div className="founding">
              <div>
                <div className="h3">Ready for a cleaner home?</div>
                <p style={{ margin: "6px 0 0", color: "#5B6474" }}>An exact price by text, flexible plans and the same team every visit.</p>
              </div>
              <div className="cta">
                <Link className="btn btn-lg" href="/quote">
                  Get my free quote
                </Link>
                <span className="fr">Free quote · No commitment to book</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <div className="foot-small" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
            <span>© 2026 {site.name}. All rights reserved.</span>
            <span>
              <Link href="/">Home</Link> · <a href={textUsHref}>Text us {site.phoneDisplay}</a> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
