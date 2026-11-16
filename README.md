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

## Form submissions (/admin/submissions)

Quote requests and waitlist signups are saved to Redis and listed at `/admin/submissions`, newest first.
Set up in Vercel (Settings → Environment Variables), then redeploy:

- `REDIS_URL`: a Redis URL reachable from the internet. On Railway, use the Redis service's **public** URL (`REDIS_PUBLIC_URL`, host like `xxx.proxy.rlwy.net`), not `redis.railway.internal`. Upstash REST (`KV_REST_API_URL` + `KV_REST_API_TOKEN`) also works.
- `ADMIN_PASSWORD`: the password for `/admin`.

Without Redis, submissions are only kept in memory (lost on restart), but they are always printed to the Vercel logs too.

## Calendar and customers (/admin, /admin/customers)

The admin home. Ported from the Claude Design export (`website-design/calendar.html`). Sign in at `/admin`; the tabs are Calendar · Customers · Booking links · Submissions (a bottom bar on phones).

- **Calendar**: Day, Week (agenda list on phones with swipe between weeks, a 7 am–7 pm time grid on desktop) and Month. Tap a visit for the visit panel: directions, call/text/WhatsApp, private notes, Mark as done (with how they paid), Reschedule, Skip (push the plan by one visit, or just skip), Cancel. Holidays (New Year's, Memorial Day, July 4, Labor Day, Thanksgiving, Christmas) are flagged.
- **Customers**: search, filters (Active, Pending pick, Ending soon, Ended), sort by next visit, name or renewal. Each customer page has the plan with progress ("1 of 3 done · 2 left"), Change plan, Pause, Renew, Cancel plan, the visits, home details and a history.
- **Booking links fill it in on their own.** When a customer confirms a link, they become a customer with the option they picked as their plan and every visit placed on the calendar (or join the customer with the same phone number). Links that are sent or viewed but not booked show as a dashed "Pending pick" visit on the reserved date; "Mark as booked" there is for people who answer by text.
- **+ button**: add a one-off visit, add a customer by hand or from a quote request, or create a booking link. Renew can also open a prefilled booking link.
- **Frequencies**: Every week, Every 2 weeks, Monthly (same week and weekday each month, e.g. "3rd Thursday", as in the design) and Every 4 weeks (what booking links offer, kept as is when a link is booked). A 3-month term is 13 weekly, 7 two-weekly, 4 four-weekly or 3 monthly cleans. "No end date" plans place a year of visits and add more as time goes on.
- Stored in the same Redis as the booking links (hash `cc:customers`, one customer with their plan and visits per entry), and every save is printed to the Vercel logs. Two open tabs can't overwrite each other: the second one is told to try again.

## Booking links (/admin/links)

Personal booking links for one customer, ported from the Claude Design export (`website-design/admin.html` and `book.html`).

- In `/admin`, every quote card has **Create booking link** (its details prefill). Or **Booking links → New booking link**, then search a quote or enter a customer by hand.
- Set a fixed date and arrival window, 1 to 3 price options (one-time or plan with frequency, term and an optional higher first-visit price), a note and an expiry (default 3 days). You get a link like `/book/judi-k7q2` to copy, text or WhatsApp.
- The customer page (`/book/[code]`) shows the locked date and time, their home details, what's included and the options. They pick one and confirm. No payment. Opening it again shows the confirmed screen.
- Statuses in the list: Sent, Viewed (opened in a browser), Booked (with the option picked), Expired, Cancelled. Cancel has Undo; editing a booked link shows a warning.
- Stored in the same Redis as submissions (hash `cc:links`), and every save is also printed to the Vercel logs. No text or email goes out automatically yet: check the Booking links tab.
- "Open customer page" from admin adds `?preview=1`, so your own look doesn't mark the link as Viewed.

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
