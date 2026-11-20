# Hiring clarity checklist (applies to all 5 variants)

Goal: a recruiter, hiring manager or client decides in under 60 seconds whether to contact. Every variant may be playful, but each item below must pass. Treat unchecked items as bugs.

## 1. The 5-second test (above the fold at 1280x800 and 390x844)
- [ ] Name or handle, plain-language role ("Software engineer"), and what they build are readable without scrolling or interacting. The H1 states it; art direction never replaces it.
- [ ] One sentence of value in plain words (no "crafting digital experiences").
- [ ] Primary action visible: `Contact` / `Hire me`. Secondary: `Resume` (download) and `See work`.
- [ ] Availability status if the CMS flag `profile.available` is true (e.g. `Open to work`); hide it when false. Never leave a stale "available" line.
- [ ] Location or time zone if the CMS provides it (recruiters filter on this).
- [ ] Photography and games are shown as extra range, not as the identity that hides the engineering. Software work comes first in navigation order.

## 2. Navigation and CTA
- [ ] Persistent access (any scroll position, any open window) to `Work`, `Resume`, `Contact` in one click. Maximum 6 top-level items.
- [ ] Labels are words, not icons alone. Links look like links; a hover is never required to discover an action.
- [ ] One primary button style per variant; the same CTA label everywhere (`Contact`, not `Get in touch` + `Hire me` + `Say hi`).
- [ ] A `Plain view` / reduced-chrome path exists for every variant: orbit `Plain view` toggle, darkroom/blueprint/arcade are already linear, os `?plain=1`.
- [ ] No scroll-jacking of core information: native scroll position, anchors, browser Back and keyboard scrolling keep working. Lenis smoothing is fine; locking scroll behind an intro is not.
- [ ] Intro ≤ 2.4s (os ≤ 3.2s), has a visible `Skip`, and is shorter on repeat visits.

## 3. Resume
- [ ] One-click download from the hero area or top bar, and again in the contact section.
- [ ] Real text PDF (ATS-parsable, not an image), filename `Name-Role-Resume.pdf`, uploaded in the CMS (`profile.resume`), served with `Content-Disposition: attachment`.
- [ ] File date visible (`Updated Nov 2026`) so it is clearly current. Do not gate it behind a form or email.
- [ ] Resume content matches the site (same roles and dates); the Experience section is derived from the same CMS data.

## 4. Project and case-study structure (every featured project)
Order: **Problem > Role > Stack > Approach (1 or 2 real decisions) > Outcome > Links**. 150 to 400 words plus 2 to 4 screenshots or a short video.
- [ ] One-line summary on the card: what it is and what changed or shipped. Outcome-first, not tech-first.
- [ ] `Live` link and `Repo` link when public. Dead links are bugs; check them in CI or before deploy.
- [ ] Stack chips (3 to 6), role (solo, lead, contributor), year, status (`shipped`, `prototype`, `planned`).
- [ ] Show 3 to 6 featured projects up front, ordered by relevance to the roles the owner wants; `All work` for the rest.
- [ ] Optional: "what I would do differently" (shows judgement). Hardware: add specs, photos of the real build, status steps.

## 5. Proof and honesty
- [ ] Metrics only if real and sourced (users, latency, stars, uptime). **Never invent numbers, testimonials, client logos or years of experience.** Leave the slot out when the CMS has no value.
- [ ] Real screenshots of real work; placeholder art is labelled in the CMS and flagged in dev.
- [ ] Testimonials need a real name, role and permission.
- [ ] GitHub, LinkedIn and Instagram links go to live profiles (`rel="noopener"`, `target="_blank"` for external).

## 6. Contact friction
- [ ] Email visible as plain text with `mailto:` and a copy-to-clipboard button (copy confirmation within 150 ms).
- [ ] Form has 3 fields max (name, email, message), proper labels, `autocomplete` attributes, honeypot + server rate limit; no CAPTCHA unless spam appears.
- [ ] Clear states: sending, success (what happens next; promise a reply time only if true), failure (keeps the typed text, shows the email as fallback).
- [ ] Contact reachable from every case-study page and from the 404 page.
- [ ] Instagram is promoted as a secondary CTA (photography sections, footer, sticky pill/bar) and never replaces `Contact`.

## 7. Accessibility and speed (these also signal engineering quality)
- [ ] Mobile Lighthouse: Performance ≥ 85 (orbit ≥ 70), Accessibility ≥ 95, SEO ≥ 95, Best Practices ≥ 95.
- [ ] LCP ≤ 2.5s on 4G mobile (targets in each brief are stricter), CLS < 0.1, INP < 200 ms.
- [ ] Body text contrast ≥ 4.5:1, large text and UI graphics ≥ 3:1 (each brief lists ratios; do not change colours without re-checking).
- [ ] Full keyboard path, visible `:focus-visible` on every interactive element, skip link, landmarks (`header`, `main`, `nav`, `footer`), one `h1`.
- [ ] `prefers-reduced-motion: reduce` gives a complete, still-attractive experience (each brief defines it). Content is visible with scripting disabled (SSR first).
- [ ] All images have meaningful `alt`; decorative layers use `alt=""` or `aria-hidden`. Canvas games and 3D scenes have a text alternative.

## 8. SEO and sharing
- [ ] `<title>`: `{Name}, Software Engineer and Photographer` (under 60 chars). Meta description 140 to 160 chars with role + what the owner builds.
- [ ] Canonical = `https://codedbyfunky.com/` for the **primary** variant; other variants set `alternates.canonical` to the primary and `robots: { index: false, follow: true }` until the owner picks a winner (avoids duplicate-content dilution).
- [ ] JSON-LD `Person` (`name`, `jobTitle`, `url`, `image`, `sameAs`: GitHub, LinkedIn, Instagram) and `CreativeWork` per featured project.
- [ ] Open Graph + Twitter: `og:title`, `og:description`, `og:image` 1200x630 generated per variant with `next/og` (`opengraph-image.tsx`), `twitter:card=summary_large_image`.
- [ ] `sitemap.xml`, `robots.txt`, favicon set, `theme-color` matching the variant background.
- [ ] Real text in server-rendered HTML (never canvas-only or image-only text); headings reflect the content outline; case-study pages have unique titles and descriptions.
- [ ] Friendly 404 with a link home and a `Contact` link.

## 9. Playful without confusing
- [ ] One signature moment per screen. If two effects compete, cut the weaker one.
- [ ] Easter eggs are bonuses only: never hide navigation, the resume or contact behind a gimmick.
- [ ] Sound is off by default and never autoplays. No cookie-consent wall: use cookie-less analytics, or none.
- [ ] Toys and games never trap focus or scroll; every toy has an off switch or `Esc`.
- [ ] The first 3D or heavy asset never delays text; a poster or text-only fallback ships first.

## 10. Measure which variant works (cheap, privacy-friendly)
Fire these events with `variant` as a property (cookie-less endpoint or analytics of choice): `cta_resume`, `cta_email_copy`, `cta_contact_submit`, `cta_instagram`, `project_open`, `plain_view_toggle`, `intro_skip`. Compare variants by `cta_* / sessions` and by median time to first CTA before choosing the primary route.

## 11. Quick recruiter journey (what must be true)
1. 0 to 5s: who, what, can I contact. 2. 5 to 20s: three best projects with outcomes. 3. 20 to 40s: resume opened. 4. 40 to 60s: email copied or form submitted. If any step needs more than one click or any explanation, simplify.
