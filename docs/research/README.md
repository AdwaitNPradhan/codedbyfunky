# Design briefs: codedbyfunky.com portfolio

Five variants of one site (Next.js 15 App Router + Payload CMS 3 + MongoDB). Each variant has its own route and is built by a separate builder session. Content is identical and comes from the CMS; only the design differs.

| Route | Brief | One-line direction | Fonts (Google) | Signature |
|---|---|---|---|---|
| `/orbit` | [orbit.md](./orbit.md) | Three.js flight through 7 stations on a camera spline | Funnel Display, Geist, Geist Mono | camera path + station set pieces |
| `/darkroom` | [darkroom.md](./darkroom.md) | Photography-led editorial under a red safelight | Instrument Serif, Hanken Grotesk, DM Mono | image "develops" + pinned film strip |
| `/blueprint` | [blueprint.md](./blueprint.md) | Cyanotype drafting sheet for engineering work | Archivo, IBM Plex Mono | PCB trace that draws on scroll + exploded view |
| `/arcade` | [arcade.md](./arcade.md) | Neo-brutalist toy shop with 2 playable games | Bricolage Grotesque, Figtree, Silkscreen | draggable spring cards + cursor toys |
| `/os` | [os.md](./os.md) | FunkyOS desktop: windows, dock, real terminal | Geist, Pixelify Sans, JetBrains Mono | boot sequence + working terminal |

Also read [hiring-clarity.md](./hiring-clarity.md): the recruiter checklist every variant must pass.

## Research basis (Nov 2026)
- Awwwards Portfolio category (Portfolio Honors, Developer Award, Sites of the Day through Sep 2026): https://www.awwwards.com/websites/website_category_portfolio/ and https://www.awwwards.com/inspiration_search/winner_category_portfolio/ (e.g. Bruno's Portfolio, Phantom.Land, Jesper Landberg, NOTHIN', Adcker, MERSI).
- Codrops 2026 case studies: scroll-driven 3D world (2026/04/28), cinematic portfolio (2026/04/14), 3D portfolio built from flat planes (2026/06/11), Jason Bergh darkroom palette (2026-02), Heron technical drawings (2026/10/12).
- Showcase platforms to keep browsing while building: https://godly.website, https://www.siteinspire.com, https://dribbble.com, https://www.awwwards.com/websites/photography-sites/.
- Every URL in the briefs was checked reachable in Nov 2026. Codrops returns 403 to plain curl, and Siteinspire returns 429 under rate limits; both load in a normal browser. Codrops pages were read through a fetch tool.
- Fonts: every family and weight in the briefs exists on Google Fonts (verified against `fonts.google.com/metadata/fonts`). Contrast ratios were computed with the WCAG formula.

## Shared rules (all variants)
**Content and data**
1. All content comes from the CMS (`profile`, `projects`, `photos`, `games`, `hardware`, `skills`, `experience`, messages). Confirm collection and field names in `src/collections` before wiring; do not hardcode copy. The "hero copy ideas" in the briefs are fallbacks and must be overridable by `profile.headline`.
2. Never invent metrics, testimonials, logos, client names or years of experience. If a CMS field is empty, omit its slot. Placeholders are flagged in dev.
3. Contact form posts to the single shared endpoint from the scaffold (do not make a new one per variant); honeypot + rate limit live server-side. Resume = `profile.resume` media. Instagram = `profile.instagram` (handle).
4. Every variant must show: about, projects, photography with Instagram CTA, games, hardware, skills, experience, contact form, resume download.

**Structure**
5. Route group per variant (`app/(site)/orbit/...`). A variant may import only from `components/shared`, `lib`, and its own folder; never from another variant.
6. Load each variant's fonts with `next/font/google` in that variant's layout only, so other routes do not pay for them. Set CSS variables on a wrapper `[data-variant="<name>"]`.
7. All colours and fonts are tokens declared once at `:root` (or the variant wrapper). No literal colour or `font-family` after the token block.
8. One `lib/gsap.ts` registers plugins once (`ScrollTrigger`, `SplitText`, `Flip`, `DrawSVGPlugin`, `MotionPathPlugin`; all free as of GSAP 3.13). Do not mix GSAP and `motion` on the same element. Use `motion` for drag/spring UI (arcade, os) and GSAP for scroll/timeline work.
9. Smooth scroll with Lenis where the brief says so; sync with ScrollTrigger exactly once:
   ```ts
   lenis.on('scroll', ScrollTrigger.update)
   gsap.ticker.add((t) => lenis.raf(t * 1000))
   gsap.ticker.lagSmoothing(0)
   ```
   Lenis is off for `prefers-reduced-motion`, on `/os` (internal scroll areas only), and `syncTouch: false` on touch devices.

**Motion tokens** (use these names; brief values override per variant)
| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16, 1, .3, 1)` (expo.out) | reveals, default |
| `--ease-in-out` | `cubic-bezier(.76, 0, .24, 1)` (power4.inOut) | wipes, page transitions |
| `--ease-back` | `cubic-bezier(.34, 1.56, .64, 1)` (back.out) | pops, stamps |
| `--dur-micro` / `-small` / `-medium` / `-large` | `150ms` / `250ms` / `400ms` / `600ms` | UI states |
Scroll reveals: `y` max 30px, `0.6 to 0.8s`, trigger once. Stagger `50 to 80ms`.

**Quality floor** (borrowed from the Hallmark skill)
10. Never `transition: all`. Animate only `transform`, `opacity`, `filter` (static targets) and `stroke-dashoffset`. Never animate `width`, `height`, `top` or `left` (the one exception: direct-manipulation window resize in `/os`).
11. Every interactive element has `:focus-visible` that appears instantly; every animation has a `prefers-reduced-motion: reduce` fallback (defined per brief); content is visible with scripting off (SSR first).
12. `overflow-x: clip` on `html` and `body` (never `hidden`, never `100vw`). Image grid tracks use `minmax(0, 1fr)`. Display headings carry `overflow-wrap: break-word; min-width: 0`.
13. The hero shows headline, one sentence and the primary action at 1280x800 without scrolling. About 80 words per screen. No emoji as icons, no purple-to-blue gradients, no card inside a card.
14. Containers are capped and centred; at 1920 the gutters grow, the measure does not.

**Performance and accessibility**
15. Respect each brief's budget table. Lazy-load anything heavy (`next/dynamic`, `IntersectionObserver`). Pause loops when off-screen or on `visibilitychange: hidden`. Clean up every listener, ticker and `ScrollTrigger` on unmount (`gsap.context().revert()`).
16. Skip link, landmarks, one `h1`, labels on inputs, alt text from CMS, text alternatives for canvases. Mobile gets its own layout (each brief has one), not a scaled-down desktop.
17. Sound is optional, off by default, never autoplays, persisted in `localStorage`, implemented with the raw WebAudio API (no extra library).
18. Analytics events from `hiring-clarity.md` section 10 are emitted with `variant` as a property.

**Definition of done per variant**
- [ ] Lighthouse mobile: Perf ≥ 85 (orbit ≥ 70), A11y ≥ 95, SEO ≥ 95.
- [ ] Passes every box in `hiring-clarity.md`.
- [ ] Checked at 390, 768, 1280 and 1920 widths, with reduced motion on and with JS disabled (content present).
- [ ] No console errors; `next build` clean; no unused dependencies added (only the libraries already chosen).
- [ ] Non-primary variants set `robots: { index: false }` and canonical to the primary until the owner picks a winner.

## Chosen libraries (do not add others)
`three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `gsap` (+ ScrollTrigger, SplitText, Flip, DrawSVG, MotionPath), `lenis`, `motion`, Tailwind CSS v4, `next/font/google`. Physics-like effects are hand-rolled (springs and a small gravity loop); no Matter.js or Rapier.
