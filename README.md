# Crystal Clean website

Next.js 15 (App Router, TypeScript, Tailwind CSS 4) site for Crystal Clean, Orlando home and vacation rental cleaning.

- `/` landing page. The quote starts in the hero (ZIP + home type) and the final CTA.
- `/quote` dedicated quote form (5 steps + thank-you). Reads `?zip=32801&type=home|rental`
  from the landing page and saves answers in the browser so a refresh doesn't lose them.
- `/api/quote` and `/api/waitlist` are **stubs**: they validate and `console.log` the request.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Design source

Both pages are ported from the Claude Design file on the "Crystal Clean Brand Identity" canvas
(Page 1 · Landing, Page 2 · Quote form). Styles are copied from the design:
`src/app/lp.css` (landing) and `src/app/quote/qp.css` (quote). Fonts: Great Vibes, Cormorant Garamond, DM Sans.
Photos from the design are in `public/images/design/`.

## Rules for this site

No prices. No discounts, offers, guarantee, reply time or business hours. Never the owner's name. Don't say insured or background-checked.
Reviews: the 3 review cards are labeled examples (`EXAMPLE_REVIEWS` in `src/components/Landing.tsx`). Never present them as real. Replace them with real reviews, word for word, or remove them.
Phone and text: (929) 766-9288 (`src/config/site.ts`). No email anywhere on the site.

## Before launch (placeholders to replace)

Text in gold [brackets] on the pages is a placeholder from the design. Replace or delete each one:

- [ ] Supplies included, pay after the clean: keep only what's true
- [ ] Plan terms (how to reschedule, skip or change a plan) in the FAQ and quote step 3
- [ ] Languages spoken, owner note, "and nearby" cities
- [ ] Real reviews (never invented)
- [ ] Service-area ZIP codes (`src/config/site.ts`, currently any 327xx / 328xx / 347xx)
- [ ] Domain (`src/config/site.ts`), privacy and terms pages
- [ ] Lead delivery: `/api/quote` and `/api/waitlist` only log requests for now. Wire them to e.g. a form service + Twilio text, or Jobber / Housecall Pro
