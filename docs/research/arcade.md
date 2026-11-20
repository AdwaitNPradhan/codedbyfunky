# /arcade — playful neo-brutalist playground

Read `README.md` and `hiring-clarity.md` first. This brief only adds what is specific to `/arcade`.

## 1. Concept
A toy shop with a day job: loud colour slabs, thick ink borders, hard shadows, stickers you can drag, stamp and drop. Everything that looks like a toy still resolves to a plain link or button.
Two small canvas games live in cabinets in the middle of the page, plus a cursor-toy box. Physics "feel" comes from springs and a tiny hand-rolled gravity loop, not a physics engine.

## 2. References (steal one thing each, copy nothing)
| URL | Steal |
|---|---|
| https://gumroad.com | Mainstream neo-brutalism: flat hot pink + yellow, thick outlines, hard offset shadows, big friendly type. |
| https://tympanus.net/codrops/2025/10/15/from-blank-canvas-to-mayhem-eloy-benoffis-brutalist-glitchy-portfolio-built-with-webflow-and-gsap/ | "Maximalism, brutalism, fun" as the three rules; glitch accents; GSAP micro-interactions. |
| https://tympanus.net/codrops/2025/10/06/self-doubt-and-the-quest-for-fun-how-i-ended-up-turning-my-portfolio-into-a-game/ | Retro-game-meets-cartoon look, impactful headings, popping animations, the page itself as a game. |
| https://bruno-simon.com | Physics-feel toys on a serious portfolio. |
| https://lusion.co | Playful object physics on hover and drag. |
| https://www.awwwards.com/inspiration/personal-brutalist-website | Personal brutalist layout browsing reference. |
| https://reallygooddesigns.com/neo-brutalist-website-examples/ | Roundup of neo-brutalist sites for typography and block layouts. |

## 3. Tokens (`[data-variant="arcade"]`)
| Token | Hex | Use | Contrast with ink `#111111` |
|---|---|---|---|
| `--ink` | `#111111` | all text, borders, shadows | base |
| `--cream` | `#FFF4D6` | page bg | ink on cream 17.2:1 |
| `--pink` | `#FF5CA8` | slab, main CTA | 6.6:1 |
| `--yellow` | `#FFD500` | hero slab, highlights | 13.3:1 |
| `--blue` | `#4D7CFF` | slab | 5.1:1. **Never white text on it (3.7:1).** |
| `--mint` | `#2EE6A6` | slab, success | 11.7:1 |
| `--orange` | `#FF6A3D` | contact slab | 6.6:1 |
| `--lilac` | `#B69CFF` | sticker/slab accent | 8.3:1 |
| `--ink-soft` | `#5A5346` | secondary text on cream | 6.9:1 |
**Rule:** all text on any coloured block is `--ink`. Cream text only on `--ink` (17.2:1). Borders `3px solid var(--ink)`. Shadow `6px 6px 0 var(--ink)`. Radius `0` on cards and slabs, `999px` on stickers and pills. Flat fills only: no gradients, no glass.

**Type**
- Display: `Bricolage Grotesque` 800 (variable: `wdth` 75 to 100, `opsz` 12 to 96). Hero `clamp(3.5rem, 12vw, 11rem)`, `wdth 75`, leading `0.85`, tracking `-0.04em`.
- Body: `Figtree` 400 and 600, 18px/1.5.
- HUD, stamps, game text: `Silkscreen` 400 and 700 at 12 to 16px (uppercase is native to it).

## 4. Layout
- Slabs: full-bleed colour bands, each with a 3px ink top and bottom border, rhythm alternates `yellow, cream, pink, cream, blue, mint, cream, orange`.
- Inside slabs: 12-col grid, container `1360px`, 32px gutters (16px mobile). Cards deliberately tilt `±1.5 to 3deg` at rest and overlap neighbours by 12px.
- Marquee dividers between slabs: 56px tall ink band, cream Silkscreen text scrolling (`22s linear infinite`), speed tied to scroll velocity (see interactions).
- Sticky nav: pill buttons on cream with ink border and hard shadow: `Work`, `Photos`, `Play`, `Lab`, `Contact`, plus `Resume` (pink fill). A toy-box button (inline SVG die, no emoji icons) at bottom-left opens the cursor-toy picker.

## 5. Hero
- Left on a yellow slab: H1 (idea) **"I make software, games and gadgets."** Sub: "Hi, I'm {name}. I build web apps, small games and electronics, and take photos too." Actions: `See my work` (ink fill, cream text) and `Hire me` (pink fill, scrolls to contact). Resume in the nav.
- Right: a spilled stack of 4 draggable cards (`About`, `Work`, `Play`, `Photos`) plus 5 stickers (SVG: star, burst, smile, arrow, `HIRE ME` badge). Cards link to their sections on click.
- Motion: cards fly in from random off-screen angles then settle with spring `stiffness 260, damping 18, mass 0.9`, `stagger 0.07s`; final rotation from `[-6, -2, 3, 5]` deg. H1 words slam in: `y 60 → 0`, `rotate 2 → 0`, `0.5s`, `back.out(1.7)`, `stagger 0.06`. A `Shuffle` button re-throws the cards (same spring).

## 6. Sections
| Section | Treatment |
|---|---|
| About | "ID card": portrait with 2 stickers, name, role, location, availability (CMS flag), 3 fact cards (draggable). Short bio, ≤ 70 words. |
| Projects | **Card pile** on a board: each project is a card (cover, title, one-line outcome, stack chips, `Case study` + `Live`). Starts scattered; `Tidy up` springs them into a 3-col grid (`layout` animation, spring `stiffness 300, damping 26`); `Shuffle` re-scatters. Click without drag opens a modal summary. Underneath the toy, the same projects exist as a normal `<ul>` (visually the cards). |
| Photography | **Polaroid wall**: tilted polaroids with tape; click flips (`rotateY 180`, `0.5s`, `power3.inOut`) to a caption. Giant **Instagram slab** (pink): `FOLLOW @handle ON INSTAGRAM`, spinning circular `FOLLOW` text stamp, sticker arrow. Appears again in footer. |
| Games | Row of two **arcade cabinets** (frame + screen) running the built-in games (section 7), `INSERT COIN` click to start. Below: cartridge cards for CMS games (cover, genre chip, `Play` link). |
| Hardware | "Gadget drawer": cards with photo, spec stickers (MCU, battery) and a `build log` accordion. An LED dot blinks (CSS `steps(2)` `1s`) when the card is hovered. Planned items: cards with dashed borders and `COMING SOON`. |
| Skills | **Sticker sheet** grouped by category with filter pills; each skill is a die-cut sticker with text label (never icon-only). Hover: wiggle `rotate [-3, 3, -2, 0]`, `0.4s`. |
| Experience | **Level select**: each job is a level card (`LV 3`, role, company, years, one-line "boss fight" achievement) on a path with dashed connectors. Newest first on mobile. |
| Contact | Orange slab. Big email text + copy button, form (name, email, message) with a giant `SEND` button, `Download save file (PDF)` = resume, GitHub, LinkedIn, Instagram. Success: confetti burst (canvas, 80 particles, `1.2s`) and a mint `SENT` stamp. |

## 7. The two mini-games (Canvas 2D, built in; each ≤ 200 lines)
Shared: logical size `360x560`, DPR `min(devicePixelRatio, 2)`, fixed 60 Hz timestep with accumulator, pause on `IntersectionObserver` (not visible) and `visibilitychange`, keyboard + pointer + touch, best score in `localStorage` (`funky:<game>:best`), no sound unless the global toggle is on. Load with `next/dynamic` when within 600px of viewport. Cabinet has `aria-label` and a text description; game canvas is `role="img"` with live score in an `aria-live="polite"` region.
1. **Stacker (tower):** a block slides left/right (start width 200, speed `180 px/s + 6 per level`, block height 28). Click, tap or Space drops it. Overhang is cut off; if overlap ≤ 0 it is game over. Perfect drop (within 3px) keeps full width and flashes. Colours cycle through the 6 tokens. Camera scrolls down (`lerp 0.12`) after level 6. Score = levels.
2. **Bug Hunt (whack):** 30s timer; bugs (12x12 pixel sprites drawn on canvas, scaled x4) pop from a 3x3 grid of holes every `900ms`, falling to `350ms`; each stays `700ms`. Click/tap = `+1`; golden bug `+5` (10% chance). Miss streak resets combo (x1 to x3 multiplier). Score 20 or more unlocks a `HIRE ME` sticker linking to contact.

## 8. Signature interactions
1. **Spring-in cards** (hero) and `Shuffle`.
2. **Draggable cards with velocity tilt:** `motion` `drag`, `dragElastic: 0.12`, `dragMomentum: true`, `dragTransition: { power: 0.3, timeConstant: 320, bounceStiffness: 500, bounceDamping: 22 }`. `rotate = clamp(velocityX / 60, -12, 12)` via `useVelocity` + `useTransform`. `whileDrag: scale 1.04`, shadow grows `6px → 12px`. Use `LazyMotion` with `domMax`. Keyboard: focused card nudges 8px per arrow key, `Space` picks up/drops.
3. **Button press:** hover `translate(-3px,-3px)` + shadow `9px 9px 0`, `0.12s`, `cubic-bezier(.2,.9,.3,1.4)`; active `translate(4px,4px)` + shadow `2px 2px 0`, `0.09s`, `ease-out`; release spring `stiffness 500, damping 20`.
4. **Cursor toys** (toy-box button or keys `1 2 3`, section 9).
5. **Marquee speed from scroll:** GSAP ticker sets `timeScale = 1 + clamp(|velocity| * 0.02, 0, 5)`, direction flips with scroll direction, eased `0.3s`.
6. **Slab slam:** each slab enters with `y 60 → 0`, `rotate 2 → 0`, `0.5s`, `back.out(1.7)`, `start: 'top 85%'`, once.
7. **Sticker peel:** on hover a corner curls (`clip-path` polygon + gradient pseudo-element, `0.25s`, `power2.out`); click throws it `±` 20px with spring.
8. **Konami code:** swaps palette (hue-rotate 140deg on slabs via CSS variable, `0.6s`) and fires confetti. Pure easter egg: never required, never mentioned in the nav.

## 9. Cursor toys (desktop only)
| # | Toy | Behaviour |
|---|---|---|
| 1 | Pointer (default) | 20px ink arrow with 2px cream outline and a 3px hard shadow; squishes to `scale(.8,1.2)` for `90ms` on click. |
| 2 | Stamper | Click leaves a random sticker (star, burst, smile, bolt SVG) rotated `±25deg`, size 40 to 72px, pops in `0.25s` `back.out(3)`. Max 30; oldest fades `0.4s`. Clear with `Esc`. |
| 3 | Gravity | Click toggles gravity for stickers and loose cards: `vy += 2200 * dt`, floor and walls with restitution `0.55`, friction `0.9`, sleeps when `|vy| < 30`. Hand-rolled loop, max 40 bodies. |
Default is Pointer. The native cursor is never hidden over form fields, modals or games.

## 10. Page-load sequence (≤ 1.8s, skippable)
1. SSR H1 and cards are in the DOM beneath a cream veil.
2. Veil shows Silkscreen `PRESS START` blinking (`steps(2)`, `0.8s`). Any key or click, or `1.4s` auto, continues.
3. Four colour bars (pink, yellow, blue, mint) slide up with `stagger 0.08`, `0.6s`, `expo.inOut`, revealing the hero; cards spring in.
4. `sessionStorage.arcadeSeen` → skip to step 3 in `0.5s`. Veil removed on `load` at the latest at 1.8s.

## 11. Sound (optional, OFF by default)
Toggle `SOUND: OFF` pill. When on: square-wave blip `440 → 880 Hz`, `70ms`, gain `0.05` on button press; coin sound in games; short chiptune jingle on `HIRE ME` unlock. Never autoplay.

## 12. Mobile
- Hero cards become a swipeable deck: `drag="x"`, advance when `offset.x > 80 || velocity.x > 300`. Project pile becomes a vertical list of cards with a `Shuffle` for fun only.
- Games are one-tap and sized to `min(92vw, 360px)`. Cursor toys hidden. Marquee at constant speed.
- Sticky bottom bar: `Hire me` (pink) + `Resume` (cream). Polaroids 2 columns. Slabs keep 3px borders, shadows `4px`.

## 13. `prefers-reduced-motion: reduce`
Marquee static (single line, no scroll). Cards render in a clean grid, no fly-in, no tilt; dragging stays available but with `dragTransition: { power: 0 }` and no overshoot. No confetti, no slam, no wiggle; `0.15s` opacity fades only. Games stay playable (user-initiated) with no screen shake or flashing. Konami and cursor toys disabled. Press-start veil skipped.

## 14. Performance budget
| Item | Limit |
|---|---|
| Rendering | DOM + 2D canvas only; no WebGL |
| Canvases | ≤ 3 loops alive (2 games + confetti), all paused offscreen / hidden tab |
| Draggable bodies | ≤ 40 total; `will-change: transform` only while dragging |
| JS (route) | ≤ 200 KB gz (`motion` via `LazyMotion` `domMax` ≈ 25 KB, GSAP core + ScrollTrigger ≈ 45 KB, Lenis 4 KB, games lazy-loaded) |
| Images | AVIF, `sizes` exact, polaroids 480w; CLS 0 |
| Web vitals | LCP ≤ 2.0s, INP ≤ 200 ms |
Animate `transform` and `opacity` only. Shadows are static `box-shadow`; swap values by class, do not tween them (use a pseudo-element for animated shadow if needed).

## 15. Builder checklist
- [ ] Every draggable card is also a real link/button, tabbable, with a visible `:focus-visible` ring (4px `--ink` outline + 2px cream gap).
- [ ] Toys never block content: `pointer-events: none` on stamped stickers.
- [ ] Skills and project info stay readable as text; no meaning conveyed by colour only.
- [ ] CMS drives projects, photos, games, hardware, skills, experience; the two built-in games are the only hardcoded content.
