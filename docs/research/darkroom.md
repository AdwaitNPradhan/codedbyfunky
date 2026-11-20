# /darkroom — photography-led editorial

Read `README.md` and `hiring-clarity.md` first. This brief only adds what is specific to `/darkroom`.

## 1. Concept
The whole page is one session in a darkroom: you enter under a red safelight, the image "develops" in the tray, then you move through a contact sheet, a 35mm film strip and a drying line of prints.
It is a magazine, not an app: huge serif type, photos at native aspect ratio, captions in mono, and Instagram as the closing call. Software work is presented as an editorial "print index", so the recruiter still gets a clean list.

## 2. References (steal one thing each, copy nothing)
| URL | Steal |
|---|---|
| https://tympanus.net/codrops/?p=108939 | Jason Bergh case study: warm dark `#1e1e1e` with cream `#FFEEC8`, never `#000`; 35mm edge lines whose speed follows Lenis velocity and persist across pages; seamless preloader as "opening credits"; network-aware downgrade. |
| https://www.awwwards.com/websites/photography-sites/ | Browse the 2026 photography entries (Honorable Mention list) for restraint: one image per screen, tiny captions. |
| https://www.awwwards.com/inspiration/film-roll-gallery-35mm | Film-roll gallery (three.js + shaders). Steal: sprocket holes and frame numbers as navigation. |
| https://www.awwwards.com/inspiration/horizontal-scroll-gallery | Horizontal scroll gallery timing. |
| https://www.commarts.com/webpicks/sofia-shcherbak-photographer | Photographer site using a literal filmstrip layout. |
| https://www.magnumphotos.com | Editorial captioning, contact-sheet language, big quiet type. |
| https://www.framer.com/marketplace/templates/filmstrip/ | Filmstrip as the primary gallery pattern (look, do not copy). |

## 3. Tokens (`[data-variant="darkroom"]`)
| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--ink` | `#141210` | page bg | base |
| `--ink-2` | `#1C1916` | panels, lightbox chrome | base |
| `--paper` | `#F1E9DA` | primary text on ink; bg of the light "print" sections | 15.5:1 on ink |
| `--ash` | `#A89F8E` | secondary text on ink only | 7.1:1 on ink, 6.7:1 on ink-2. **Never on paper (2.2:1).** |
| `--ash-dark` | `#6B6354` | secondary text on paper | 4.9:1 on paper |
| `--safelight` | `#E5391F` | large type, rules, marks, glow | 4.4:1 on ink: large text (24px+) and graphics only |
| `--safelight-text` | `#FF5A3C` | small red text, links on ink | 6.0:1 on ink; ink on this fill 6.0:1 |
| `--safelight-ink` | `#D6361C` | red on paper, graphics only | 3.95:1 on paper: never body text; white on it 4.8:1 |
One accent only (safelight). Two modes inside one page: dark "tray" sections (`ink`) and light "print" sections (`paper`, text `ink`). Never `#000` or `#fff`.

**Type** (next/font/google)
- Display: `Instrument Serif` 400 and 400 italic. Hero `clamp(4.5rem, 15vw, 17rem)`, leading `0.86`, tracking `-0.035em`. Section titles `clamp(3rem, 9vw, 9rem)`. Italic only for whole phrases (pull quotes, captions), never one word inside a roman heading.
- Body: `Hanken Grotesk` 400, 500, 600 at 18px/1.55.
- EXIF and index data: `DM Mono` 400 and 500 at 12 to 13px, lowercase, tracking `0.02em`. Set EXIF as a 3-cell mini grid (aperture, shutter, ISO), not a dot-joined string.

## 4. Layout and grid
- 12 columns, 24px gutters, container max `1440px`, page padding `clamp(16px, 4vw, 56px)`.
- Photos keep native aspect ratio from CMS `width/height` (set `aspect-ratio` to prevent CLS). Never crop to a fixed ratio.
- Rhythm varies on purpose: full-bleed hero, offset 7/5 split for about, tabular list for projects, 6-column contact sheet, pinned horizontal strip, then light-mode contact.
- Fixed UI: top bar (wordmark left, `Work` `Photography` `About` `Resume` `Contact` right) at 56px, `mix-blend-mode: difference`; bottom-left frame counter in DM Mono (`frame 07 / 36`, updates by section).
- Film-edge detail: two 18px-tall strips (top and bottom of viewport) carrying sprocket holes (CSS `radial-gradient` repeat 24px) and tiny frame numbers. They drift in opposite directions at `0.2px` per ms, plus `scrollVelocity * 0.4`. Opacity 0.35.

## 5. Hero
- Full-viewport photo (CMS `profile.heroPhoto`, 3:2 or wider, AVIF, preloaded `priority`) under a safelight wash. Type bottom-left, huge.
- H1 (idea): **"Engineer by day. Photographer always."** Sub: "I build software for the web and keep a camera close. Hire me for the first, follow me for the second." Actions: `See my work` (ghost, underline) and `Follow on Instagram` (solid `--safelight-text` fill, ink text). Resume link in the top bar.
- Motion ("develop in the tray"): photo starts `filter: grayscale(1) brightness(.18) sepia(1) saturate(4) hue-rotate(-25deg)` and tweens to `none` over scroll 0 to 40vh with `scrub: 0.8` (also auto-plays `2.4s` `power2.out` on load before first scroll). H1 SplitText lines mask-reveal `yPercent 105 → 0`, `1.1s`, `stagger 0.08`, `expo.out`.
- Grain overlay: fixed, 256px PNG noise tile, `opacity .07`, `mix-blend-mode: overlay`, background-position stepped via `steps(6)` over `0.9s` infinite (about 7 fps). One element for the whole page.

## 6. Sections
| Section | Treatment |
|---|---|
| About | 7/5 split. Left: 6-frame contact strip of the owner's photos with a red grease-pencil circle drawn on the chosen frame (DrawSVG `0.8s` `power2.inOut`). Right: serif lead (28px) + 3 sentences + `Resume` and `Email` text links. |
| Projects (software) | **Print index**: editorial rows (`01`, title in 56px serif, year in mono, stack in grotesk). Hover shows the cover image following the cursor (320x220, `lerp 0.12`, tilt by x-velocity max 6deg). Click opens `/darkroom/work/[slug]`. Show 6 featured rows + `All work` link. |
| Photography | Four parts: (a) contact sheet, 6 cols desktop / 3 mobile, thumbnails with frame number + red grease marks on "picks"; (b) click opens the **enlarger** lightbox; (c) pinned **film strip** of the best 12 to 18 frames; (d) **Instagram block**: serif "Follow the darkroom" + `@handle` button + 6 curated CMS photos linking out (`rel="noopener"`). No third-party embed script. |
| Games | "Test strips": 3 to 6 small framed prints, play badge, muted looping WebM on hover (preload none). Link `Play`. |
| Hardware | "Bench notes": asymmetric 2-col, photo of the build + mono notes (MCU, power, status). Planned projects shown as undeveloped dark frames labelled `not yet developed`. |
| Skills | "Kit list": three columns (Languages, Frameworks, Tools) in DM Mono; tag each `daily`, `often` or `learning`. No percentage bars. |
| Experience | Vertical list, year in huge outlined serif (`-webkit-text-stroke: 1px var(--paper)`, transparent fill) that fills on hover (`0.35s`, `power2.out`), role + company + one line beside it. |
| Contact | Light "print" section. Giant serif **Say hello.**, email as visible text + copy button, form (name, email, message), `Resume` download, GitHub, LinkedIn, Instagram. Underlines in `--safelight-ink`. |
Instagram CTA appears **3 times**: hero secondary button, after the film strip (big), footer. A sticky pill `Instagram` slides in bottom-right once the photography section is on screen (`x 120 → 0`, `0.5s`, `expo.out`).

## 7. Signature interactions
1. **Develop-in hero** (above).
2. **Pinned film strip:** `ScrollTrigger` `pin: true`, `scrub: 1`, `end: '+=' + stripWidth`, tween `x: -(stripWidth - innerWidth)`, `ease: 'none'`. Frames skew by `quickTo` `skewX = clamp(velocity * -0.003, -4, 4)` deg, `duration 0.4`, `power3.out`. Frame counter ticks per frame crossing the centre.
3. **Contact sheet to enlarger:** GSAP Flip from thumbnail to centred full image, `0.7s`, ease `cubic-bezier(.87,0,.13,1)` (expo.inOut). Backdrop `rgba(20,18,16,.96)` with a safelight vignette (`radial-gradient(circle, transparent 40%, rgba(229,57,31,.18))`). Arrow keys and swipe change frame, `Esc` closes, focus is trapped, thumbnail regains focus on close.
4. **Safelight cursor:** 140px soft red radial glow (`rgba(229,57,31,.28)` to 0) following at `lerp 0.14`. Over a photo it becomes a 96px loupe showing a 2x zoom of the pixel under it (second `<img>` clipped by `clip-path: circle()`; desktop only).
5. **Grease-pencil marks:** hand-drawn SVG circles/crosses draw on (`DrawSVG`, `0.6s`, `power2.out`, stagger `0.12`) when a contact-sheet row enters (`start: 'top 75%'`, once).
6. **Iris page transition:** `clip-path: circle(0% at x y) → circle(150% at x y)`, `0.8s`, `expo.inOut`, origin at the clicked link. Old page stays beneath.
7. **Project image trail:** described in Projects.
8. **Section inversion:** entering Contact, `--ink` and `--paper` swap via a `clip-path` wipe bottom to top (`0.9s`, `power4.inOut`), not a colour fade.

## 8. Page-load sequence (≤ 2.2s, skippable, shorter on repeat)
1. `0 to 0.5s` black `--ink`; SSR H1 is already in the DOM under the veil (LCP stays text/hero image).
2. `0.5s`: a 14px safelight dot fades in centre (the enlarger lamp). Mono text `developing 000 → 100` driven by real hero-image load progress.
3. At 100: veil `opacity 1 → 0` over `1.2s`, `power2.inOut`; hero develops; film-edge strips slide in from the sides (`0.8s`, `expo.out`).
4. `sessionStorage.darkroomSeen` → run in `0.5s`. `Skip` link visible.

## 9. Cursor
Desktop pointer: safelight glow (above). Links: glow shrinks to 60px and the link underline draws (`scaleX 0 → 1`, `0.3s`, `power3.out`). Photos: loupe. Inputs and lightbox controls: native cursor. Keep native cursor visible at all times (glow is an overlay, not a replacement).

## 10. Sound (optional, OFF by default)
Toggle bottom-left. When on: shutter sound (WebAudio: 60ms white-noise burst through a 1.2 kHz band-pass, gain 0.08) on lightbox open; film-advance tick (4ms click, gain 0.02) per strip frame. Never autoplay.

## 11. Mobile
- Film strip is a native horizontal scroller (`scroll-snap-type: x mandatory`, frames `78vw`, `scroll-snap-align: center`), no pin.
- Contact sheet 3 columns. Lightbox: swipe down to close (`drag="y"`, close when `offset.y > 120 || velocity.y > 500`), swipe left/right to move.
- Hero photo uses a mobile crop from CMS (`heroPhotoMobile`, 4:5) if present. Cursor glow, loupe and image trail disabled. Grain opacity `.05`.
- Sticky bottom bar after the photography section: `Follow on Instagram` full width, dismissible, remembers dismissal.
- Display type floors: hero `4rem`, section titles `2.6rem`.

## 12. `prefers-reduced-motion: reduce`
Show the final developed photo with no filter tween. Grain static. Film edges static. Strip = native scroll-snap row (no pin, no skew). Lightbox and iris become `150ms` opacity fades (no Flip). No cursor glow or loupe. Grease marks appear fully drawn. Section inversion is an instant swap. Sound toggle unaffected.

## 13. Performance budget
| Item | Limit |
|---|---|
| Hero image | ≤ 220 KB AVIF at 1920w (`priority`, `fetchpriority=high`); LQIP 16px blur placeholder from CMS |
| Gallery images | `next/image` with exact `sizes`; thumbs 320w, lightbox 1600w; `content-visibility: auto` on off-screen sections |
| In-viewport decoded images | ≤ 24 at once; strip frames `loading="lazy"` |
| JS (route) | ≤ 180 KB gz (GSAP core + ScrollTrigger + Flip + SplitText + DrawSVG ≈ 70 KB, Lenis 4 KB, motion only for lightbox drag if used) |
| Fixed overlays | max 3 (grain, film edges, cursor glow); only `transform`/`opacity` animate |
| Web vitals | LCP ≤ 2.0s, CLS 0 (aspect ratios everywhere), INP ≤ 200 ms |
| Network aware | if `navigator.connection.saveData` or `effectiveType !== '4g'`: skip develop tween, no video, no loupe |
No WebGL on this route. Keep `will-change` off except on the strip track while pinned.

## 14. Builder checklist
- [ ] Photos only from CMS with alt text; if `alt` is empty, build fails a dev warning.
- [ ] Instagram handle from `profile.instagram`; all IG links open in a new tab with `rel="noopener"`.
- [ ] Resume, Email, Instagram reachable from the top bar or sticky pill at all times.
- [ ] Focus-visible ring: 2px `--safelight-text` on ink, `--ink` on paper.
- [ ] Contact sheet and strip are real `<ul><li><a><img>`; lightbox is progressive enhancement over them.
