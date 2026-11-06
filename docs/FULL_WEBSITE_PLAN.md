# Wondar website: from landing page to full website

Draft for review, 2026-11-06. Written from the current code in `wondar-landing-page`, not from a client brief, so section 9 lists what we still need to confirm.

## 1. Where the site is today

One long home page plus a few utility pages.

| Page | What it does |
| :-- | :-- |
| `/` | Hero with waitlist form and a "Coming Soon" badge, Features (4 cards), How It Works (3 steps), For Creatives (3 benefits), Beta Testers call to action |
| `/testers` | Beta tester application form |
| `/creative/[userId]` | Public creative profile with an "open in app" modal |
| `/privacy`, `/terms` | Legal text |
| `/delete-account` | Account deletion request form (needed for the app stores) |
| `/contact` | New: report a problem or send an idea, with screenshots and a confirmation email |

Header links are anchors on the home page (Features, How It Works, For Creatives) plus Testers and a waitlist button. The footer has social links and the legal pages. Everything is built to collect waitlist sign-ups, which is the right job before launch and the wrong one after it.

## 2. Goal

Turn a single-purpose waitlist page into the public face of a live marketplace that:

1. Explains Wondar to clients and creatives in plain language.
2. Gets visitors to download the app (the main conversion once it is live).
3. Lets people find creatives and services from search engines, not just from the app.
4. Builds trust: how payments work, how disputes are handled, what it costs.
5. Gives people who are stuck a way to reach us (contact form, FAQ).

## 3. Proposed site map

**Primary navigation:** Find a creative · How it works · For creatives · Pricing · Help · Download (button)

| Page | Purpose | Notes |
| :-- | :-- | :-- |
| Home `/` | Explain, convince, download | Reworked, see section 4 |
| Find a creative `/creatives` | Public directory, filter by category and city | Reads published creatives and services from Convex. Biggest SEO win. |
| Category pages `/creatives/[category]` | e.g. Hair, Makeup, Photography | One page per service category, same data source |
| Creative profile `/creative/[userId]` | Already exists | Add service list, reviews, share image |
| How it works `/how-it-works` | Client journey step by step | Today a home page section, give it room |
| For creatives `/for-creatives` | Why join, how payouts work, how to start | Includes the $ and timing facts creatives ask about |
| Pricing `/pricing` | Fees and payout timing in plain words | Needs client sign-off, see section 9 |
| Safety and trust `/trust` | Secure payments, reviews, disputes, cancellations | Can also be a section on Pricing |
| Help center `/help` | FAQ grouped for clients and creatives, with the contact form at the bottom | Start with 15 to 20 questions from support and the Big Ten pilot |
| About `/about` | Who is behind Wondar and why | Optional at launch |
| Download `/download` | Store buttons, QR code, deep links | Short link target for social posts |
| Contact `/contact` | Exists | Link from Help and the footer |
| Legal | Privacy, Terms, Delete account (exist) | Add Community guidelines and Cancellation and refund policy |
| Blog `/blog` | Tips, creative spotlights | Phase 3, only if someone will write |

## 4. Home page structure

1. **Hero:** headline, one sentence, App Store and Google Play buttons (waitlist form only until the iOS app is live), phone mockup.
2. **Trust strip:** secure payments, verified creatives, reviews.
3. **Categories:** tiles linking to category pages.
4. **How it works:** three steps for clients, keep the current illustrations.
5. **Featured creatives:** live from Convex, links to profiles.
6. **For creatives:** short pitch and button to `/for-creatives`.
7. **Social proof:** quotes from pilot users once we have permission.
8. **FAQ teaser:** top five questions, link to Help.
9. **Final call to action** and footer.

Remove when the app is live: the "Coming Soon" badge (hero and footer) and the Beta Testers section.

## 5. Content the site needs

| Item | Source |
| :-- | :-- |
| Final headline and one-line pitch | Client |
| Real app screenshots, store badges, app icon | Design and store listings |
| Fees explained in plain language | Client decision, we write it |
| FAQ answers | Support history and the pilot findings |
| Founder or team story, photos | Client |
| Quotes and creative spotlights | Pilot testers (ask permission first) |
| Legal pages review | Client or their counsel |

## 6. Technical plan

- **SEO basics:** unique title, description and Open Graph image per page, `sitemap.xml` and `robots.txt`, canonical URLs, structured data (Organization on Home, LocalBusiness-style Service data on creative profiles, FAQPage on Help).
- **Dynamic pages from Convex:** a small set of public, read-only queries (published creatives, services by category, one creative). They return only fields safe to show publicly. Pages are server-rendered or revalidated every few minutes so Google can index them.
- **Performance:** keep images in `next/image`, lazy load below the fold, drop heavy animation from above-the-fold sections, target Lighthouse 90+ on mobile.
- **Analytics and conversion:** privacy-friendly analytics (Plausible or similar), events for store button clicks, waitlist joins and contact submissions. Cookie banner only if analytics need it.
- **Forms:** waitlist stays until launch. Contact form already has spam protection and email confirmation; add the same honeypot to the tester form.
- **Environment variables to set:** `NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_URL` (contact form screenshots), App Store URL once live.
- **Accessibility:** heading order, alt text, visible focus, contrast check on the lime and green palette, form labels.
- **Hosting and deploy:** keep the current setup, add preview deployments per branch so the client can review each phase.
- **Shared backend:** the site and the app share one Convex project, so any new public query goes in `wondar-admin` and is synced.

## 7. Phases

| Phase | Scope | Estimate |
| :-- | :-- | :-- |
| 1. Foundation | New header and footer, shared page layout, SEO setup, sitemap, analytics, move How it works and For creatives to their own pages, Download page, FAQ-lite on Help | 3 to 4 days |
| 2. Trust pages | Pricing, Safety and trust, full Help center, Community guidelines, Cancellation and refund policy | 3 days plus client sign-off on wording |
| 3. Live data | Public queries, creative directory, category pages, richer creative profiles, featured creatives on Home | 4 to 5 days |
| 4. Launch switch | Remove "Coming Soon" and Beta Testers, swap waitlist for store buttons, final QA, redirects | 1 to 2 days |
| 5. Growth (optional) | Blog, spotlights, press page, city pages | Ongoing |

Phases 1 and 2 can start now and ship while the app is still in pilot. Phase 3 needs enough creatives with published services to look good.

## 8. Low-risk preparation we can do immediately

- Create the shared layout, navigation and footer so new pages drop in.
- Add `sitemap.xml`, `robots.txt` and per-page metadata.
- Move How it works and For creatives into their own routes, keep the home page sections as teasers.
- Write the first FAQ from the pilot bug list and the questions in the WhatsApp group.
- Add the Download page with the Google Play link now and the App Store link behind an environment variable.
- Add analytics events for the existing forms.

## 9. Decisions and questions for the client

1. What does "full website" mean to them: marketing site only, or also a place to browse and book on the web?
2. Is the iOS app live, and when? It decides when the badge, hero and waitlist change.
3. Are fees public? The app takes a client fee and a creative fee; a Pricing page makes them visible.
4. Which cities or regions do we show first? Directory pages need enough creatives per city.
5. Who writes and approves content (FAQ, About, blog)?
6. Do creatives consent to appearing in the public directory and on Home? An opt-out in the app may be needed.
7. Any brand updates (logo, colours, photography style) before we build more pages?

## 10. Risks

- A public directory with few creatives looks empty. Mitigation: category pages only after a minimum count, featured section hidden when empty.
- Public queries must never expose private data (email, phone, exact location). They return a defined public shape only.
- Pricing and refund wording has legal and financial weight. Client signs off before publishing.
- Two sources of truth for fee numbers (app and site). Keep the numbers in one place and link to it.
