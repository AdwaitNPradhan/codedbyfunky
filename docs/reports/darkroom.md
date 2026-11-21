# Report: `/darkroom` variant

Status: built, tested, and ready for review at `http://localhost:3000/darkroom`.
All code is in `src/variants/darkroom/` (14 files, about 4,200 lines). Nothing outside that folder changed, except this report.

## What it is

A photography-led editorial site. The page is one session in a darkroom: a red safelight, film grain, a contact sheet, a pinned 35mm film strip, and big serif type. The engineering work still comes first for a recruiter. The nav order is Work, About, Photography, Resume, Contact.

Page order: Hero, Work (print index), About, Photography (contact sheet, film strip, Instagram block), Games, Hardware, Skills, Experience, Contact, footer.

Fonts: Instrument Serif, Hanken Grotesk, DM Mono (`next/font/google`, loaded only on this route). Tokens are on the `[data-variant="darkroom"]` wrapper. There is one accent (safelight). No `#000` and no `#fff` anywhere.

## How each interaction works

| Interaction | How it works |
|---|---|
| Intro | A veil with a red lamp and `developing 000 → 100`. The count follows the real hero image load (it waits at most 1.2 s). A `skip` button is always visible. The repeat visit (sessionStorage) runs in about 0.5 s. If scripting fails, a CSS fallback fades the veil after 3.6 s. |
| Develop-in hero | The photo starts as a dark red-tinted monochrome and tweens to full colour (2.4 s after the veil lifts). Scrolling 0 to 40vh pushes it further and it never goes back. The H1 lines mask-reveal with SplitText. |
| Safelight cursor | A 140 px red glow follows the pointer (lerp 0.14). It shrinks to 60 px over links. Fine pointers only. The native cursor stays visible. |
| Loupe | Over any contact-sheet or film-strip frame, a 96 px circle shows a 2× zoom. In the lightbox, a `loupe` button (or the `L` key) turns it on for mouse and touch (the loupe sits above the finger on touch). |
| Contact sheet | 6 columns on desktop, 3 on mobile. Frames keep their native aspect ratio. Hover or focus shows aperture / shutter / ISO. Red grease-pencil crosses draw on over the picks (DrawSVG) when the rows enter. |
| Enlarger (lightbox) | GSAP Flip from the thumbnail to the centred print. Arrow keys and swipe change frame. `Esc`, swipe down (offset > 120 px or velocity > 500 px/s), or `close` closes it. Focus is trapped. Focus returns to the thumbnail of the frame you ended on. `exif` (or `I`) reveals aperture, shutter, ISO, camera and lens. The page behind is `inert`. |
| Film strip | Desktop: ScrollTrigger pin and scrub, with skew from scroll velocity and a frame counter. A mouse drag moves the strip (it drives page scroll). Touch and tablet: a native scroll-snap row (78vw frames) that you drag with a finger. Mouse drag also works on this row. |
| Print index (Work) | Editorial rows. On a fine pointer the cover follows the cursor (320×220, lerp 0.12, tilt from x-velocity, max 6°). On mobile each row has a small thumbnail. 6 rows show first, then `All work (n)`. |
| Case studies | Open in-page with an iris wipe (clip-path circle) from the clicked row. Order: problem, role, stack, approach, outcome (with real CMS metrics), links, gallery. Deep link: `#project-<slug>`. Browser Back closes it. Previous / next case study and a `Contact` button are inside. |
| Games | One framed screen with `GameEmbed` plus a rack of "test strip" prints to pick from. The game theme uses `--game-*` variables. `Open full screen` links to `/games/<slug>`. |
| Hardware | "Bench notes", an asymmetric two-column layout. Planned builds show a dark frame labelled `not yet developed`. It develops a little on hover. |
| Experience | Years in a huge outlined serif that fill on hover. On touch devices the row nearest the middle of the screen fills. |
| Section inversion | An ink cover over the first screen of Contact wipes up (clip-path, scrubbed to scroll) to reveal the paper. |
| Instagram | Four places: hero stamp (rotating text ring), a big block after the film strip, the footer, and a floating pill (desktop) or dismissible bottom bar (mobile, remembers dismissal). The pill shows from Photography until Contact. |
| Contact | `useContactForm('darkroom')`. Name, email, message. Field errors. Typed text is kept on failure. A fallback `mailto:` shows. Email has a copy button (instant `Copied`). Resume download. |
| Sound | Off by default, never autoplays. Toggle bottom-left, saved in localStorage. WebAudio shutter on lightbox open and a tick per strip frame. |
| Film edges / grain | Two sprocket strips drift against each other plus scroll velocity. One grain tile (generated once on a canvas). One fixed grain element. |

## Reduced motion

Verified: no veil, the final developed hero photo, no SplitText, no Lenis, no pin or skew (native snap row), grease marks fully drawn, instant section swap (no wipe), no glow or auto loupe, static grain and edges, and lightbox and case study use a 150 ms fade.

Note: the explicit `loupe` button in the lightbox still works with reduced motion, because the user asks for it.

## What I tested

Built-in browser against the shared dev server.

- Widths: 390×844, 768×1024, 1024×768, 1280×800, 1920×1080. No horizontal overflow at any of them (`scrollWidth === innerWidth`). I scrolled every section at 390, 1024, 1280 and 1920, and at 768 the hero and Work.
- Every flow I could click: top nav (smooth scroll, active state), hero buttons, Work rows (hover cover, open, previous / next, Contact button, `Esc`, Back, deep link), contact sheet, lightbox (open, arrow keys, `I`, `L` loupe, `Esc`, focus restore, focus trap, swipe left, swipe down), film strip (pin, skew, mouse drag in native mode), Instagram pill and bar, games (the real Bug Squash loaded and was themed), email copy, sound toggle (state saved), resume link.
- Contact form: one invalid submit (`a@b` shows "That email looks off", text kept, `mailto:` fallback) and one valid submit (success message, fields cleared). I sent exactly one real message (name "QA Tester"). **It is in the CMS inbox and went to the owner by email. Delete it.**
- Keyboard: skip link, wordmark, nav order, visible focus ring (safelight on ink, ink on paper).
- Reduced motion: checked by overriding `matchMedia` before load in a same-origin iframe (the browser pane cannot set the OS flag).
- Console: no errors or warnings after a clean load and a full scroll (the only errors I saw were my own earlier CSS mistake, now fixed, and a hydration warning that came from hot-reloading while editing).
- `npx tsc --noEmit | grep src/variants/darkroom` prints nothing. The Impeccable detector reports no findings.

## Decisions you should know about

- **Hero photo:** the CMS has no `heroPhoto`. The hero uses the first featured photo. `heroPhotoMobile` is not supported.
- **H1:** "Engineer by day. Photographer always." is used when `roles` mention both an engineer/developer and a photographer. Otherwise it falls back to the CMS tagline. The name and first role are in the H1 for screen readers and shown in the facts line.
- **Skills:** the CMS gives a number `level`, not daily/often/learning. I map 5 to `daily`, 4 to `often`, 3 or less to `learning`. The three columns map from `category`: Interface (frontend, mobile), Backend and ops (backend, devops), Bench and darkroom (hardware, creative, tools).
- **Film strip frames and sheet:** the sheet shows all photos (max 36). The strip shows featured photos first, then the rest (max 18). Picks (crosses) are `featured` photos.
- **Analytics:** there is no endpoint. Events (`cta_resume`, `cta_email_copy`, `cta_contact_submit`, `cta_instagram`, `project_open`, `photo_open`, `intro_skip`) fire as a `portfolio:event` DOM event with `variant: 'darkroom'`. Connect it to an endpoint when you pick one.
- **Resets in a cascade layer** (`@layer dr-reset`), so no reset can beat a component class.
- **Empty data:** Work, Photography, Games, Hardware, Skills, Experience hide when empty. Resume, email, availability and Instagram slots hide when empty.

## Known gaps (not done, or not verified)

1. **Resume date** ("Updated Nov 2026") is not shown. The CMS has no date field and the media route sends no `Last-Modified` header. Add a `resumeUpdated` field to show it.
2. **Game preview video** (muted WebM on hover) is not built. The CMS `Game` type has no video field. Posters develop from grey to colour on hover (always in colour on touch).
3. **JS size** is not measured (no `next build`, as the contract says). Estimate: GSAP core + ScrollTrigger + SplitText + DrawSVG about 50 KB gz, Lenis 4 KB, my code about 15 KB gz. Flip, the lightbox and the case study dialog are separate chunks that load on idle. This should be well under 180 KB. Check it with a real build.
4. **Lighthouse** was not run. LCP is the hero image (`priority`, 1920 rendition, blur placeholder).
5. **`content-visibility: auto`** is not used. It would break ScrollTrigger measurements for the pinned strip and the contact wipe. Images are lazy and use `aspect-ratio` instead, so layout shift is zero.
6. **Network-aware mode** (`saveData` or not 4g): skips the develop tween and the auto loupe. It was not tested on a slow connection.
7. **Touch** was tested with mouse-driven pointer events in the 390 px emulation, not on a real phone. The swipe code uses plain pointer events, so it should behave the same.
8. **Playwright MCP** was unavailable (it needs a browser extension). In the built-in browser the page runs slowly when the pane is in the background, so screenshots lag one step. I checked state through the DOM when a shot looked stale.
9. **Page-level SEO** (title, OG image, canonical, noindex) belongs to the shared route, not this variant. I did not touch it.
10. **`/darkroom` iris transition between pages** is only used for case studies, because the contract forbids new routes.
11. The hero stamp's text ring uses `textLength`. A very long Instagram handle will tighten the letter spacing.

## Files

`index.tsx` (root, scroll engine, overlays), `Chrome.tsx` (grain, edges, cursor, nav, HUD, intro, pill), `Hero.tsx`, `Work.tsx`, `About.tsx`, `Photography.tsx` (sheet, strip, Instagram block), `Lightbox.tsx`, `ProjectDialog.tsx`, `More.tsx` (games, hardware, skills, experience), `Contact.tsx`, `engine.ts` (velocity, intro gate, sound, events), `lib.tsx` (hooks, helpers, `Pic`), `gsap.ts`, `fonts.ts`, and six CSS modules (`root`, `story`, `photo`, `dialog`, `more`, `contact`).
