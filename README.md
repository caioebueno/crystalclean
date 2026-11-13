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

No prices. No discounts, offers, guarantee, reply time or business hours. Don't mention when clients pay or rescheduling. No sample addresses. Never the owner's name. Don't say insured or background-checked.
Reviews: the 3 reviews (`EXAMPLE_REVIEWS` in `src/components/Landing.tsx`) are made up for the mockup. Before any public launch, replace them with real reviews, word for word, or remove them.
Phone and text: (929) 766-9288 (`src/config/site.ts`). No email anywhere on the site.

## Form submissions (/admin)

Quote requests and waitlist signups are saved to Upstash Redis and listed at `/admin`, newest first.
Set up in Vercel:

1. Storage tab → add **Upstash for Redis** (Marketplace) and connect it to this project. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
2. Settings → Environment Variables → add `ADMIN_PASSWORD` (the password for `/admin`).
3. Redeploy.

Without Redis, submissions are only kept in memory (lost on restart), but they are always printed to the Vercel logs too.

## Tracking

Meta Pixel `1802403317477629` (`src/lib/fbq.ts`, loaded in `src/app/layout.tsx`). It sends PageView on every page and Lead when a quote request or waitlist signup is sent.

## Before launch (placeholders to replace)

Text in gold [brackets] on the pages is a placeholder from the design. Replace or delete each one:

- [ ] Owner story paragraph in "Not a franchise"
- [ ] Real reviews: the 3 in `EXAMPLE_REVIEWS` are made up for the mockup
- [ ] Service-area ZIP codes (`src/config/site.ts`, currently any 327xx / 328xx / 347xx plus 33837, 33896, 33897)
- [ ] Domain (`src/config/site.ts`), privacy and terms pages, favicon (still the Next.js default), Instagram handle
- [ ] Optional: a text alert to you when a new quote comes in (e.g. Twilio)
