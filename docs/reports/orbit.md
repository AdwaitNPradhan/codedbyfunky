# /orbit — build report

Route: `http://localhost:3000/orbit`. Code: `src/variants/orbit/**` (38 files, about 6.8k lines). Nothing outside that folder and this file was edited. No git state changed, no installs, no `next build`.

## What it is

A fixed Three.js canvas behind real HTML. The page scrolls natively (Lenis smooths it). Scroll position drives a camera on two Catmull-Rom splines (position and look target) through 7 stations. Every station has a 3D set piece and a DOM twin, so every 3D object that does something also has a normal link or button.

| # | Station (hash) | 3D set piece | DOM overlay |
|---|---|---|---|
| 1 | Hello (`#hello`) | wireframe sun, two rings, hot core, stars | H1 from CMS tagline, name + first sentence of bio, `Contact` / `Resume` / `See the work`, availability, location; About panel with portrait, bio, roles, socials |
| 2 | Work (`#work`) | field of cover-image slabs in two rows, camera weaves | list of projects, active card (role, year, client, stack, `Case study`, `Live`, `Repo`) |
| 3 | Photography (`#photography`) | helix of framed photos, the active one lifts to the left | caption + 3 EXIF cells, `View photo`, solid `Follow @handle` pill, pitch |
| 4 | Games (`#games`) | arc of wire cabinets, screens show the cover with scanlines | game list, `GameEmbed` frame, `Open full screen` |
| 5 | Hardware (`#hardware`) | tilted PCB, traces with a pulse every 3 s, one chip per build, planned = dashed | list with status chips, specs, links |
| 6 | Skills (`#skills`) | constellation (a node per skill, lines per category), experience tick rail | skills grouped as text; experience timeline |
| 7 | Contact (`#contact`) | lit window, dust, floor glow, pulses on send | email + copy, form, Resume, GitHub, LinkedIn, Instagram |

Design tokens, fonts (Funnel Display, Geist, Geist Mono via `next/font`), station tints and the HUD (wordmark, Work / Resume / Contact, 7-tick rail, `03/07 Photography` counter, `Plain view`, `Sound`) follow `docs/research/orbit.md`.

## How the interactions work

- **Scroll → camera.** `lib/useFlight.ts` measures each station section and writes scroll state (`u`, `pos`, per-station progress, velocity) into a plain mutable `store`. `useFrame` reads it. No React state per scroll tick. Each station is a tall section with one sticky 100svh child; panels inside fade in and out from scroll position. Travel between stations is about 0.7 viewport heights, dwell is set per station from item counts.
- **Rail / nav / hash.** Rail tick, top nav and CTAs call `lenis.scrollTo` (2.2 s, power4 in-out). The camera flies through the stations in between. The URL hash follows the active station (`replaceState`, so Back is not polluted). A hash on load, or a manual hash edit, jumps to that station.
- **3D hover and click.** Raycast via r3f pointer events. Hover scales 1.06 and lifts, and the cursor ring grows to 56 px with a label (`OPEN`, `VIEW`, `PLAY`, `FLY`). Slab → case study, photo → viewer, cabinet → select, click again to start the game, chip → select hardware item, sun → fly to Work, window → focus the form. The page DOM also mirrors this: hovering a list row lights the same 3D object.
- **Case studies** open in-page (`ui/CaseStudy.tsx`): Problem, Role, Stack, Approach, Outcome (+ real metrics), Links, then Previous / `Work with me` / Next. Hash `#project-<slug>`; Back closes; Esc closes; focus is trapped and restored; the rest of the app is `inert`; scroll is locked.
- **Photo viewer** (`#photo-<n>`): arrows step, Esc closes, link to the photo's Instagram post.
- **Games.** Only the active game mounts a `GameEmbed`. Pressing Play locks page scroll (so arrow keys do not scroll) and shows `Exit game`. The game's own Esc means pause, so Exit, or any rail/nav click, leaves the game.
- **Contact form** uses `useContactForm('orbit')`: 3 fields, labels, `aria-invalid`, field errors clear when you edit the field, typed text survives a failed send, email shown as fallback on failure, success replaces the form and the window pulses.
- **Plain view.** Same HTML, stacked, no canvas, no Lenis. Default when `prefers-reduced-motion` matches, with no WebGL2, or with `saveData` / `deviceMemory ≤ 2`. Choice persists in `localStorage`. It keeps your station when you toggle. The toggle is hidden under reduced motion.
- **Also in:** magnetic CTA buttons, velocity star streaks, custom cursor (fine pointer only), sound (off by default, raw WebAudio, resumes only after a gesture), skippable intro veil (shorter on repeat visits), analytics as `funky:track` DOM events (`cta_resume`, `cta_email_copy`, `cta_contact_submit`, `cta_instagram`, `project_open`, `plain_view_toggle`, `intro_skip`).

## Performance choices

- First paint is server-rendered text. The veil has a CSS-only fallback timer, so a failed script never hides content.
- three, r3f, drei and postprocessing are one `next/dynamic({ ssr: false })` chunk, mounted ~60 ms after hydration. GSAP, ScrollTrigger, SplitText and Lenis are dynamic imports too.
- DPR `[1, 1.5]` (1 on phones). `PerformanceMonitor` lowers DPR first, then drops Bloom/Noise/Vignette. Phones: no post, 500 stars, no raycast hover (tap works), lighter constellation.
- Station set pieces are only visible near the camera; textures load when the previous station is reached, use `thumb` on phones, and are disposed on unmount. Shared geometries are disposed on unmount.
- `?lowfx` on the URL turns off post-processing and DPR above 1.

## What I tested

Browsers: the in-app browser (software WebGL, about 2 fps) and a local headless Chromium (swiftshader) driven through `playwright-core`.

- **Widths 390, 768, 1280, 1920:** all 7 stations reached through the rail at each width, scrolled, screenshots reviewed; horizontal overflow was 0 px everywhere (flight and plain).
- **Flows:** rail jump (all 7), nav links, Resume link, copy email (label flips immediately, clipboard holds the address), selector list and pager, 3D hover label (`OPEN`), 3D click opens the case study, case study open/Esc/hash/Back/scroll-lock/inert, photo viewer open/next/Esc, Play + Exit game, cabinet click starts the game, magnetic pull (10 px max) and spring-back, sound toggle on/off + persistence, Plain ↔ Flight round trip (keeps Contact), deep link `#games` / `#photography`, Skip intro.
- **Contact form:** empty submit → three field errors + fallback line; valid submit → confirmation + window pulse (one real message sent: "Orbit Tester", `orbit-test@example.com`; delete it in the CMS inbox).
- **Reduced motion** (`reducedMotion: 'reduce'`): Plain view, no canvas, no veil, no toggle, no overflow at 1280 and 390.
- **No scripting:** stacked page, content and links present, veil hidden.
- **Keyboard:** skip link first, ice focus ring on every control, Esc closes overlays, Tab trapped in dialogs and focus restored to the opener when opened from a button.
- **Console:** no errors or hydration warnings from orbit at any width. One library warning remains: `THREE.Clock: This module has been deprecated` (react-three-fiber 9.8.2 with three 0.187).
- **SSR:** `curl /orbit` contains the H1, all projects, photos, games, hardware, skills, experience and email; one `h1`; header, main, nav, footer landmarks.
- `npx tsc --noEmit`: clean. Impeccable detector: one advisory, the `--ease-back` token from the brief.

## Known issues and not done

- **Performance is not measured on a real GPU.** The test renderer is software. Lighthouse, LCP, INP and bundle sizes (≤ 260 KB gz route JS) were not measured, because `next build` is not allowed. The budget choices above are by design, not by measurement.
- `npx eslint` crashes project-wide (circular JSON in the `react` plugin config), so lint did not run for any variant.
- The shared dev server showed errors from other variants while I worked (darkroom CSS `:where()` "not pure", an arcade `domMax` build error). Not orbit; details in the shared notes folder.
- Resume "Updated Nov 2026" date is not shown: `SiteData` has no file date.
- No `/orbit/projects/[slug]` pages (the contract says in-page).
- Mobile photo layout is a smaller spiral with the active photo centred, not a literal vertical row of 6.
- Reduced motion uses Plain view with a CSS gradient poster; there is no one-frame 3D still per station.
- Cabinet screens show the cover image with a scanline shader, not a GIF or video texture.
- The scene renders every frame while visible (no idle throttling yet).
- Sound was toggled and persisted but not listened to (headless).
- With more than 8 projects or games (or 6 hardware items) flight mode shows the first 8 / 6 and offers Plain view for the rest.
- Page metadata, JSON-LD and OG images belong to the route owner and were not touched.

## Handy

- `?lowfx` — cheap 3D for slow machines and software renderers.
- `localStorage['orbit:view']` = `plain` | `flight`, `['orbit:sound']` = `1` | `0`, `sessionStorage['orbitSeen']` = shortens the intro.
