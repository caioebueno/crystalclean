import type { Review } from "@/content/reviews";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** One customer review, styled for pages that use lp.css. */
export default function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="card rev rev-real" style={{ margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
      <blockquote style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 22, lineHeight: 1.35, margin: 0 }}>&ldquo;{review.text}&rdquo;</blockquote>
      <figcaption style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
        <span className="rev-av" aria-hidden="true">
          {initials(review.name)}
        </span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
          <strong style={{ color: "#0E1F3D" }}>{review.name}</strong>
          <span style={{ fontSize: 14, color: "#5B6474" }}>
            {review.date} · {review.city}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
