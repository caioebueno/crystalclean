# Crystal Clean website (design prototype)

Pages exported from the Crystal Clean design canvas:

- `index.html`: landing page (sales sections + quote starter)
- `quote.html`: dedicated quote form (5 steps + thank-you)
- `calendar.html`: private admin home, Calendar + Customers (visits, plans, renewals)
- `leads.html`: private admin, Submissions board (New → Contacted → Price sent → Success → Discarded, with totals and discard reasons)
- `admin.html`: private admin, Booking links + Submissions (create a personal booking link)
- `book.html`: the customer booking page a link opens (pick an option, confirm)
- `Book.dc.html`: same as `book.html`; `admin.html` loads it for its live phone preview, keep it next to it
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

## Booking links flow

1. Open `admin.html`. It starts with Judi's link filled in. Tap **Create link**.
2. On the success screen, tap **Open customer page** (opens `book.html`).
3. Pick an option and tap **Confirm my booking**.
4. Back in `admin.html` > Booking links, Judi shows as **Booked**.

Links and bookings are stored in the browser's `localStorage` (key `cc-links-v1`),
so this only works in one browser. "Reset prototype data" at the bottom of the
admin clears it. In production, links need a database, a real short URL
(`/book/<id>`), expiry enforced on the server, and the admin behind a login.

## Calendar flow

1. Open `calendar.html`. It opens on the week of Nov 15–21 with Thursday, Nov 19 selected.
2. Tap Darnell's 1:00 PM clean, then **Mark as done**, pick how he paid, and confirm.
3. Tap **View Darnell** in the message at the bottom: his plan shows **1 of 3 done · 2 left**.

Sample customers and visits are built into the page and reset on reload. Tabs link
`calendar.html` and `admin.html` together. In production, customers, plans and visits
need a database, and a confirmed booking link should create the customer automatically.

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

## Favicon

`favicon/` holds the Roofline "C" icon (navy, gold roof, cream C):
`favicon.ico` (16/32/48, each size hand-tuned), `favicon.svg`, 16/32 PNGs,
`apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` and
`site.webmanifest`. Both pages already link them in `<head>`.
