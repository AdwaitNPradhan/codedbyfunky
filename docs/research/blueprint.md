# /blueprint — hardware and engineering drawing sheet

Read `README.md` and `hiring-clarity.md` first. This brief only adds what is specific to `/blueprint`.

## 1. Concept
The page is a drafting sheet in cyanotype blue: ISO-style border, zone letters, a title block that changes as you scroll. One continuous PCB trace runs down the margin and draws itself as you read, branching to each section like a net to a pad.
Hardware projects are shown as annotated drawings with exploded views, specs and status. Software and photography are filed as "BOM", "reference plates" and "revision table" so the metaphor stays readable.

## 2. References (steal one thing each, copy nothing)
| URL | Steal |
|---|---|
| https://tympanus.net/codrops/2026/10/12/heron-ai/ | Technical drawings and annotations as the whole visual language; sketch becomes finished state tied to scroll position. |
| https://www.awwwards.com/inspiration/blueprint-reality-sutera-stella-muhlhaus | Blueprint to rendered reality microinteraction. |
| https://www.awwwards.com/inspiration/scroll-assembly-byld | Scroll-driven assembly (parts fly in and lock). |
| https://www.awwwards.com/inspiration/desktop-blueprint-2 | Blueprint layout treatment on desktop. |
| https://corentinbernadou.com | Swiss grid, 1px ruler guides, `Option + G` grid reveal, cursor-following nav mask. Steal the ruler/grid toggle. |
| https://teenage.engineering | Industrial labelling, spec-sheet typography, strict grid, product as hero. |
| https://play.date | Hardware presented with friendly exploded views and clear specs. |
| https://21st.dev/@harshjadhavconnect/components/circuit-board | MIT circuit component: pulses travelling along right-angle traces (read the approach, rebuild with GSAP). |
| https://www.framer.com/marketplace/components/circuit-traces/ | Trace aesthetic reference. |

## 3. Tokens (`[data-variant="blueprint"]`)
| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--paper` | `#0C3B66` | page bg (cyanotype) | base |
| `--paper-deep` | `#082B4C` | panels, title block, table zebra | base |
| `--line` | `#E6F1FF` | primary text and drawing lines | 10.0:1 on paper, 12.6:1 on deep |
| `--line-dim` | `#9FC3E8` | secondary text, dimension lines, idle traces | 6.2:1 on paper, 7.8:1 on deep |
| `--amber` | `#FFC857` | callouts, active trace, links, CTA fill | 7.5:1 on paper, 9.4:1 on deep; paper `#0C3B66` text on amber 7.5:1 |
| `--red` | `#FF8A7A` | warnings, `PROPOSED`, form errors | 5.0:1 on paper |
| `--grid-minor` / `--grid-major` | `rgba(230,241,255,.07)` / `.16` | 8px and 64px grid | decorative |
| `--vellum` | `#F4F0E4` | tear-off contact slip, printable resume sheet | text `#1B2B3A` 12.7:1, `--paper` 10.0:1 |
Two accents max: amber (live) and red (warning). Photos get a cyanotype duotone at rest and full colour on hover.

**Type**
- Display and body: `Archivo` (variable: `wdth` 62 to 125, `wght` 100 to 900). H1 `font-variation-settings: "wdth" 118, "wght" 700`, `clamp(3rem, 8vw, 8rem)`, leading `0.95`, tracking `-0.02em`. Body `wdth 100, wght 400`, 17px/1.6. Title-block labels `wdth 75, wght 600`.
- Mono: `IBM Plex Mono` 400, 500, 700 at 12 to 14px. Uppercase with tracking `0.08em` is allowed here (it is the drawing-label material): `SHEET 03/08`, `DETAIL A (2:1)`, part numbers, coordinates.

## 4. Layout and grid
- 12 columns on an 8px base grid; container max `1360px`. Fixed drawing frame: `24px` inset border (1.5px `--line`), tick marks every 64px, zone letters `A to F` on the sides and `1 to 8` across the top.
- Fixed title block bottom-right (`360x88`): `DRAWN BY funky`, `SHEET {n}/{N} {SECTION}`, `SCALE 1:1`, `REV C`, date. Digits roll vertically on change.
- Section header pattern: part number in mono (`P-03`), 5-col title, a thin dimension line spanning the column width with arrowheads and a mono measurement.
- Master trace: a single SVG path in the left margin (`x ≈ 32px`), 2px stroke `--line-dim`, `stroke-linejoin: miter`, only 90 degree and 45 degree bends (like a real PCB). Branch traces end in 14px pads (ring + hole) at each section header.
- Grid backgrounds are one fixed element with two CSS `linear-gradient` layers, not DOM lines.

## 5. Hero (Sheet 01)
- Left: H1 (idea): **"Software engineer who builds hardware too."** Sub: "I design and ship web software, small games and electronics, and photograph the rest." Actions: `View projects` (amber fill) and `Download resume` (outline). Status chip from CMS (`Available for work`) in mono.
- Right: an isometric exploded view (own SVG, not from CMS) of a generic handheld: 5 layers (top case, display, PCB, battery, bottom case). Isometric via `matrix(.866 .5 -.866 .5 0 0)`.
- Motion: on load, border draws (`DrawSVG`, `1.2s`, `power2.inOut`), grid lines fade in (`stagger 0.015`, `0.6s`), H1 SplitText lines reveal. Then scroll 0 to 60vh `scrub: 1` separates layers by `i * -70px` while leader lines draw (`DrawSVG`) and callout badges pin-drop (`scale 0 → 1`, `0.4s`, `back.out(2)`, `stagger 0.08`) at progress > 0.6. Layers re-assemble when leaving the hero.

## 6. Sections
| Section | Treatment |
|---|---|
| About | "General notes": numbered list 1 to 6 in drawing-note style (plain-language bio, location, what the owner is looking for). A circular portrait labelled `DETAIL A (2:1)` with a magnifier leader line. |
| Projects (software) | **Bill of materials** table: `ITEM`, `NAME`, `STACK`, `STATUS`, `YEAR`. Sticky header. Hover a row: bracket draws on the left (`DrawSVG 0.35s power2.out`) and a preview card with cover + one-line outcome appears at the cursor. Click opens `/blueprint/projects/[slug]` as an "assembly drawing" page (problem, role, stack, 2 decisions, outcome, links). Show 6 to 10 rows. |
| Photography | "Reference plates": grid of figures `FIG. 01..n` with corner crosshairs, a scale bar and one-line caption. Cyanotype duotone at rest (SVG `feColorMatrix` filter) cross-faded to colour on hover (`0.4s`, two stacked images, animate `opacity` only). **Instagram CTA** as a callout: amber pill `REF: @handle, SEE FULL SET` with an arrow leader line, shown after the grid and in the footer. |
| Games | "Test report": each game is a row `TEST 04: <name>`, stack, a stamped `PASS` badge (amber, rotated -4deg, `scale 1.6 → 1`, `0.3s`, `back.out(3)` when the row enters), `Play` link, small GIF. |
| Hardware (hero section) | One full sheet per featured project: big SVG diagram or photo left, annotated callouts right (numbered badges with leader lines), spec table (MCU, power, I/O, size), and a 5-step status line `concept > breadboard > PCB > enclosure > shipped` where completed steps are filled. Planned projects use dashed lines and a red `PROPOSED` tag. |
| Skills | "Pinout": each category is a DIP-style IC (body with category name, 8 to 16 numbered pins, each pin a skill label). Hovering a pin lights it amber and highlights the matching projects in the BOM. Mobile: accordion list. |
| Experience | **Revision table**: columns `REV`, `DATE`, `DESCRIPTION`, `BY`; newest first (`REV E`...`REV A`). Plain text, easy to skim. |
| Contact | `--vellum` tear-off slip with perforated top edge (CSS `radial-gradient` holes). Fields (name, email, message) have mono test-point labels `TP1..TP3`. Email visible + copy button, `Download full drawing set (PDF)` = resume, GitHub, LinkedIn, Instagram. Success: the master trace completes into the slip and a `CONTINUITY OK` amber stamp appears. |

## 7. Signature interactions
1. **Border and grid draw-on intro:** see section 5; total `1.8s`.
2. **Master trace scroll draw:** `ScrollTrigger` on the whole page, `scrub: 0.6`, `DrawSVG` `0% 0% → 0% 100%`, `ease: 'none'`. Branches draw at `start: 'top 70%'`, `0.9s`, `power2.inOut`. A single amber pulse (circle r=4) travels the master path with `MotionPath`, `3s`, `linear`, repeat, paused when the path is off-screen.
3. **Exploded view scrub:** section 5; `scrub: 1`.
4. **Inspect cursor:** a 20px crosshair plus a mono readout of position in mm (`x / 3.78`, 1 decimal). Hovering an element draws dimension lines to its edges (`getBoundingClientRect`, `0.2s` fade) with its width/height in mm. Press `G` (or the `GRID` chip) to toggle full grid and ruler overlay.
5. **Title-block roll:** sheet digits and section name slide vertically (`yPercent 100 → 0`, `0.5s`, `expo.inOut`) when a new section crosses 50% viewport.
6. **BOM bracket + preview:** described in Projects.
7. **Callout pin-drop:** `scale 0 → 1`, `0.4s`, `back.out(2)`, `stagger 0.08` when a diagram enters (`top 70%`, once).
8. **Cyanotype to colour:** described in Photography.

## 8. Page-load sequence (≤ 2.4s, skippable)
1. `0 to 0.3s` solid paper-deep. SSR text is in the DOM.
2. `0.3 to 0.9s` blue fill wipes bottom to top (`clip-path inset(100% 0 0 0) → inset(0)`, `0.6s`, `power4.inOut`).
3. `0.9 to 2.1s` border + grid draw; title block types `FUNKY / PORTFOLIO / REV 2026` in mono (24 chars, `steps(24)`, `0.5s`); H1 reveals.
4. `sessionStorage.blueprintSeen` → `0.8s` total. `Skip` link visible.

## 9. Cursor
Desktop: crosshair + mm readout (above). Over links: crosshair closes to a 6px amber dot; over inputs: native I-beam. Hide on `pointer: coarse`. Readout hides inside `<input>`/`<textarea>`.

## 10. Sound (optional, OFF by default)
Plotter ticks while the master trace is drawing (4ms noise tick, gain 0.02, rate = scroll velocity clamped to 12/s), relay click on section change (30ms square 180 Hz, gain 0.04). Toggle `SOUND OFF` in the title block. Never autoplay.

## 11. Mobile
- Frame border `12px`, no zone letters. Title block collapses to a top chip (`SHEET 03/08 HARDWARE`).
- Master trace moves to `x = 16px` and stays; branches shorten. Pulse stays.
- Exploded view = 3 layers and fewer callouts (max 4). Pin-drop and leader draws still run, but without `scrub`; they trigger once (`0.6s`).
- BOM becomes stacked cards. Pinouts become accordions. Cursor readout and `G` grid disabled; a `GRID` chip stays for tap.
- Contact slip is full width, inputs 48px high.

## 12. `prefers-reduced-motion: reduce`
All paths render fully drawn (`stroke-dashoffset: 0`). Exploded view shows a static exploded state with callouts visible. No pulse, no pin-drop, no title-block roll (instant swap), no crosshair cursor (native cursor, no readout). Grid is static. Page-load is a `150ms` fade. `PASS` stamps are static.

## 13. Performance budget
| Item | Limit |
|---|---|
| Rendering | SVG + CSS only; no canvas, no WebGL |
| Animated paths | ≤ 60 at once; only paths in view animate (`ScrollTrigger` toggles) |
| Filters | cyanotype `feColorMatrix` applied to static images only, never to animated elements; ≤ 12 filtered images in view |
| Pulses | 1 `MotionPath` instance |
| Backgrounds | 1 fixed grid element (CSS gradients) |
| JS (route) | ≤ 160 KB gz (GSAP core, ScrollTrigger, DrawSVG, MotionPath, SplitText, Lenis) |
| Web vitals | LCP ≤ 1.5s (text), CLS 0, INP ≤ 200 ms |
Use `transform`/`opacity`/`stroke-dashoffset` only. No `transition: all`. No `will-change` except during a running scrub.

## 14. Builder checklist
- [ ] Hardware sheets read `hardware` collection (title, status, spec rows, diagram media or photo, steps); do not hardcode projects.
- [ ] Traces use only 0, 45 and 90 degree bends (lint by eye: no curves).
- [ ] Every diagram has text equivalents (`<figcaption>` + spec table) for screen readers; callout badges are real list items.
- [ ] Mono caps labels stay 12px or larger and `--line-dim` or brighter.
- [ ] Printable resume sheet: `@media print` renders `--vellum` background and ink text.
