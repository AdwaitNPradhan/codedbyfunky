# /blueprint report

Route: `http://localhost:3000/blueprint`. Code: `src/variants/blueprint/**` only. No git changes, no installs, no build.

## What I built

A cyanotype drafting sheet. All content comes from `SiteData`. The page has 9 sheets, in this order:

| Sheet | Section | Drawing metaphor |
|---|---|---|
| 01 | Hero: headline, Contact / Resume / See work, spec strip, availability | Cover, isometric exploded view |
| 02 | About | General notes, `DETAIL A (2:1)` portrait, stats as "design data" |
| 03 | Software projects | Bill of materials table |
| 04 | Hardware | One sheet per build, interactive exploded view, status line |
| 05 | Photography + Instagram CTA | Reference plates `FIG. 01..n` |
| 06 | Games | Test report, `PASS` stamps, embedded `GameEmbed` |
| 07 | Skills | Pinout: DIP chips (accordion on phones) |
| 08 | Experience | Revision table `REV D..A` |
| 09 | Contact | Vellum work-order slip, email copy, resume, socials |

Software comes first in the nav and in the page order. Nav: Work, Hardware, Photography, Games, Resume, Contact (6 items). The `INDEX` chip lists every sheet.

## Interactions

- **Inspect cursor** (fine pointers only): 20px crosshair with live `X / Y` in mm (`px / 3.78`, document coordinates). It closes to a 6px amber dot over links and hides over inputs. Hovering any `[data-dim]` block (photos, hero spec, exploded views, portrait) draws dimension lines with width and height in mm.
- **`G` or the `GRID` chip**: stronger grid, plus mm rulers with live cursor markers (desktop). On phones the chip only strengthens the grid.
- **`M` or the `MEASURE` chip**: drafting toy. Drag, or click two points, to drop a dimension line with length and angle. It snaps to ortho within 3 degrees. Lines are in document coordinates, so they scroll with the page. Works with taps on touch. `C` clears, `Esc` or `DONE` exits.
- **Master PCB trace**: one SVG path in the left margin, only 0, 45 and 90 degree bends. It is laid out from the real DOM (pad anchors in each section head), so it follows any content length. It draws with the scroll (DrawSVG, smoothed). Branch traces and ring pads draw once as each header nears the viewport. One amber pulse (MotionPath) runs only along the drawn part. On contact success the whole trace turns amber into the slip.
- **Hero exploded view**: 5 isometric layers, own SVG. Sticky range of 50vh, `scrub: 1`: layers separate, leader lines draw, numbered badges pin-drop. Hover or focus a legend chip to light the layer. Phones: 3 layers, plays once, no scrub.
- **Hardware exploded view** (`ExplodeLab`): built from each build's real parts list. Drag to rotate and tilt, pinch or `Shift+scroll` to zoom, `EXPLODE` slider, buttons, arrow keys, `0` resets, double-click resets. Parts fly apart the first time it scrolls into view. Hover or focus a part chip to highlight the part. It uses a small hand-rolled 3D projection, written to the DOM without re-rendering React. Touch: horizontal swipe rotates, vertical swipe still scrolls the page.
- **BOM**: sticky header. Hover a row: bracket draws on the left (DrawSVG) and a preview card follows the cursor. Click a row (or the name, or Enter) to open the case study as an **assembly drawing sheet**: problem, role, stack, approach, outcome, measured values, links, Contact. Arrow keys or buttons flip between projects. Deep link: `/blueprint#project-<slug>`.
- **Plates**: cyanotype duotone at rest (static SVG `feColorMatrix`, wrapper opacity cross-fades to colour). Hover or focus on desktop. On touch, a plate turns to colour as it crosses the middle of the screen. Click opens a plate sheet with EXIF and an Instagram link. Amber pill `REF: @handle · SEE FULL SET` after the grid and in the footer.
- **Games**: accordion of tests. One game open at a time, nothing loads until Play. Full-screen link goes to `/games/<slug>`. Games are themed with the `--game-*` tokens.
- **Pinout**: hover, focus or tap a pin. The readout shows level, years and how many BOM rows use it, and the matching BOM rows light up.
- **Title block**: sheet number and name roll vertically when a new sheet crosses the middle. Date is set on the client.
- **Intro**: blue wipe, title block types itself, then the border draws. About 2.3s first visit, shorter on repeat (`sessionStorage.blueprintSeen`). `Skip` button and `Esc`.
- **Contact**: `useContactForm('blueprint')`. Controlled inputs keep the text after an error. Errors per field, plus the email as fallback. Copy button confirms at once.
- Analytics hook: `bp:event` custom events on `window` (`cta_resume`, `cta_email_copy`, `cta_contact_submit`, `cta_instagram`, `project_open`). No endpoint exists, so nothing is sent.

## Reduced motion, no JS, print

- `prefers-reduced-motion`: no loader (150ms fade), no Lenis, no crosshair (native cursor), no reveals, no pulse, trace fully drawn, hero view static and exploded with callouts visible, static stamps.
- JS off: all text is in the HTML. The hero shows exploded with callouts. The loader is hidden by `<noscript>`.
- Print: vellum paper, ink lines, chrome hidden.

## What I tested

All with headless Chromium (playwright-core from the repo), real mouse, keyboard and CDP touch.

- **Widths** 390×844, 768×1024, 1280×800, 1920×1080: whole page scrolled, screenshots read, no horizontal scroll (`scrollWidth == clientWidth` at all four).
- **Every control** on desktop: legend hover, cursor, dims, `G`, `M` drag, index (open, link, close), BOM hover preview, case sheet (open, arrows, Esc, deep link), lab (drag, slider, Shift+scroll zoom, reset, part hover), compact hardware toggle, plate hover and sheet, game open and Play (a game loaded), pinout hover lights BOM, copy email, nav anchors, `All plates`.
- **Mobile**: tap targets audited (fixed: BOM name, spec links, mailto), lab swipe and pinch via CDP touch, accordion tap lights BOM, index chip, plates colour on scroll.
- **Focus**: Tab order and visible outlines, focus trap in sheets (25 Tabs stay inside), Esc closes, focus returns to the opener.
- **Contact**: invalid submit (field errors, typed text kept, email fallback). Then one valid send: `CONTINUITY OK` stamp, trace turns amber. One real message was sent in dev.
- **Console**: no errors in any run. The only warnings: font preloads from the shared route (see below), and at 390 and 1920 Next's dev-only "image detected as LCP" for the open game poster. That one appears only because my script jumps down the page without any real user input.
- **Types**: `npx tsc --noEmit | grep src/variants/blueprint` prints nothing.
- **Detector**: `impeccable detect` finds only 2 advisories, both pinned by the brief: `back.out` easing on stamps and badges, and the blueprint grid.
- **DOM audit**: one `h1`, landmarks present, no unnamed buttons or links, no images without alt, no duplicate ids, all inputs labelled.
- Fresh-compile hydration warning seen once, right after I edited files. It did not come back in 8 later cold loads.

## Decisions and deviations from the brief

- Section titles are plain words ("Software projects"). The drawing name sits in the dimension line (`P-03 · BILL OF MATERIALS · 294.2 MM`, the mm value is the live width).
- BOM column `STATUS` is `ROLE`: the CMS has no project status.
- Hardware status line is derived from `status`: built = 5 of 5 steps, in-progress = 3 (step 4 current), planned = 1. Planned builds use dashed lines and a red `PROPOSED` tag. The CMS has no step data.
- Hardware spec table shows only real fields: status, year, parts count, tools, files. The brief's MCU, power and I/O rows do not exist in the CMS.
- Exploded hardware view is illustrative: slabs are built from the parts list. Enclosure outlines are generic. The caption says so.
- Hero H1 is `settings.tagline`. The name and roles are in the spec strip and in a visually hidden prefix inside the `h1`.
- Hero layers do not re-assemble when you leave the hero (they are off screen by then).
- Hero sticky range is 50vh, not 60vh. Below 900px the hero is linear (no sticky).
- Photos: 9 shown, `All plates (n)` shows the rest. BOM: 8 shown, then `All work (n)`.

## Not done, or not verified

- **Sound** (optional in the brief) is not built.
- **Resume date** (`Updated Nov 2026`) is not shown: the data has no file date.
- **Lighthouse** not run, **no `next build`** (not allowed). JS budget is estimated: GSAP core, ScrollTrigger, DrawSVG, MotionPath, SplitText and Lenis are about 68 KB gz, and my code adds roughly 30 KB gz, so about 100 KB gz against the 160 KB budget.
- Not tested on a real phone or real Safari. Touch was checked with Chromium touch emulation only.
- Photos in the demo data are generated gradients, so the duotone looks like the filter on soft shapes. Check it again with real photos.

## Notes for the orchestrator (outside my folder)

1. `next/image` rejects the CMS media URLs (`http://localhost:3000/api/media/file/...` is absolute, `images.localPatterns` only matches relative paths). I fixed it inside my variant with `imgSrc()` in `util.ts`, which reduces same-origin `/api/media/...` URLs to the path. Other variants will hit the same error until the data layer returns relative URLs or `images.remotePatterns` is set.
2. `src/app/(frontend)/[variant]/page.tsx` imports every variant, so one variant's compile error (orbit's missing `./scene/Scene` for a while) returned 500 on all routes, mine included.
3. The same shared route makes Next preload the fonts of all five variants on every route (about 20 `woff2` preloads, with "preloaded but not used" warnings).
4. The Playwright MCP needs its browser extension, which is not installed. The in-app browser pane runs about 2 fps when hidden, so I tested with headless Chromium scripts.
