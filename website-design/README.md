# Crystal Clean website (design prototype)

Two pages exported from the Crystal Clean design canvas:

- `index.html`: landing page (sales sections + quote starter)
- `quote.html`: dedicated quote form (5 steps + thank-you)
- `images/`: hero, owner section and host-report photos (Unsplash / Pexels, free license)
- `support.js`: the runtime that renders the pages (bundles React, MIT license)

## Preview

The pages need to be served over HTTP (not opened as `file://`), so the ZIP code
and home type carry over from the landing page to the quote page:

```bash
cd website-design
python3 -m http.server 8080
# open http://localhost:8080
```

## How it works

- "Start my free quote" saves the ZIP + home type in `localStorage`
  (key `cc-quote-v1`) and opens `quote.html`, which reads it.
- Quote answers are saved after every tap, so a refresh keeps them.
- Pages are responsive: desktop layout above 820 px, phone layout below.

## Before going live

This is a design prototype, not production code. For launch, rebuild it in your
stack (plain HTML/CSS, Next.js, Webflow, etc.) and:

1. Connect "Send my quote request" to a real backend (form service, CRM, or
   SMS tool). Right now it only shows the thank-you screen.
2. Replace every gold `[bracketed]` placeholder: phone number, email, owner
   note, trust claims, plan terms, review cards, supplies answer.
3. Replace the in-area ZIP check (currently any ZIP starting with 327, 328 or
   347) with your real service ZIP list.
4. Swap stock photos for photos of real homes you've cleaned.
5. Use final logo files (SVG/PNG with the script outlined) instead of the
   live Great Vibes font.

Brand: Roofline logo (Concept K), Navy #0E1F3D, Champagne Gold #C9A25E,
Antique Gold text #7A5D27, Cream #FAF6F0. Fonts: Great Vibes (logo only),
Cormorant Garamond (headings), DM Sans (body).
