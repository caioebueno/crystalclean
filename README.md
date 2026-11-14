# Crystal Clean website

Next.js 15 (App Router, TypeScript, Tailwind CSS 4) site for Crystal Clean, Orlando home and vacation rental cleaning.

- `/` landing page. The quote starts in the hero (ZIP + home type) and the final CTA.
- `/testimonials` real customer reviews (`src/content/reviews.ts`, word for word). The landing page Reviews section shows the same list.
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
Reviews: only real reviews, word for word, in `src/content/reviews.ts`. Never make one up.
Phone and text: (929) 766-9288 (`src/config/site.ts`). No email anywhere on the site.

## Form submissions (/admin)

Quote requests and waitlist signups are saved to Redis and listed at `/admin`, newest first.
Set up in Vercel (Settings → Environment Variables), then redeploy:

- `REDIS_URL`: a Redis URL reachable from the internet. On Railway, use the Redis service's **public** URL (`REDIS_PUBLIC_URL`, host like `xxx.proxy.rlwy.net`), not `redis.railway.internal`. Upstash REST (`KV_REST_API_URL` + `KV_REST_API_TOKEN`) also works.
- `ADMIN_PASSWORD`: the password for `/admin`.

Without Redis, submissions are only kept in memory (lost on restart), but they are always printed to the Vercel logs too.

## Tracking

Meta Pixel `1802403317477629` (`src/lib/fbq.ts`, loaded in `src/app/layout.tsx`). It sends PageView on every page and Lead when a quote request or waitlist signup is sent.

## Before launch (placeholders to replace)

Text in gold [brackets] on the pages is a placeholder from the design. Replace or delete each one:

- [x] Owner story paragraph in "Not a franchise" (generic text kept, brackets removed; edit if you want your own words)
- [x] Real reviews: 3 real reviews added (`src/content/reviews.ts`), shown on the home page and `/testimonials`
- [ ] Service-area ZIP codes (`src/config/site.ts`, currently any 327xx / 328xx / 347xx plus 33837, 33896, 33897)
- [x] Domain: crystalcleanorlando.vercel.app (override with `NEXT_PUBLIC_SITE_URL` for a custom domain)
- [x] Privacy (mentions the Meta Pixel) and terms pages
- [ ] Favicon (still the Next.js default), Instagram handle
- [ ] Optional: a text alert to you when a new quote comes in (e.g. Twilio)
