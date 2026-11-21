# Report: `/arcade` variant

Route: `http://localhost:3000/arcade`. Code: `src/variants/arcade/**` (about 6,500 lines). No other file was changed.

## What I built

A neo-brutalist toy shop with a day job. Hard shadows, thick ink borders, flat colour slabs, draggable spring cards, stickers, cursor toys, and a wall of arcade cabinets. Everything that looks like a toy is still a real link or button.

| Part | What the visitor gets |
|---|---|
| Intro | `PRESS START` veil. Any key or tap, or 0.8 s, runs four colour bars up (about 1.8 s total). Repeat visits skip to the bars (0.5 s). A CSS failsafe removes the veil at 2.8 s even if JS never loads. |
| Nav | Sticky pills: Work, Play, Photos, Lab, Contact, Resume. Coin counter (opens the achievements list) and `SOUND: OFF` pill. On mobile: Menu button plus a bottom bar with `Hire me` and `Resume`. |
| Hero | H1 "I make software, games & gadgets." (two fixed lines). Name, role, tagline, availability and location from the CMS. Buttons: See my work, Hire me, Resume. Desktop: four draggable cards plus five stickers that fly in after the veil, with a `Shuffle` button. Mobile: a swipeable deck with a `Next card` button. |
| About | ID card (portrait, name, roles, location, status), short bio with a "More about me" toggle, three draggable fact cards from `settings.stats`. |
| Work | Project cards on a dotted board. `Tidy up` and `Shuffle`. Click a card (not drag) for a case-study dialog in the hiring order: Problem, Role, Stack, Approach, Outcome, Links, plus a Contact button. Deep link: `#project-<slug>`. Featured projects first, `All work (n more)` for the rest. The cards are the `<li>` items of one real list. |
| Play | The arcade wall. Two big cabinets play right on the page (Bug Squash and Server Stack when they exist). The other games are mini cabinets that open a player dialog. All games come from `GameEmbed`. Only one game runs at a time. |
| Photos | Polaroid wall. Click flips a polaroid to its caption, camera data and an Instagram link. A giant pink Instagram slab with a spinning `FOLLOW` stamp. The same slab returns, smaller, in the footer. |
| Lab | Gadget drawer. Cards with status, spec stickers, a `Build log` accordion. The LED blinks on hover or focus. Planned items get a dashed border and `COMING SOON`. |
| Skills | Sticker sheet grouped by category with filter pills. Every sticker has a text label and `LV n`. |
| Experience | Level select: newest level first, `LV n`, role, org, dates, one "boss fight" highlight. |
| Contact | Orange slab. Email as text plus a Copy button, resume as `Download save file (PDF)`, social pills, the form (`useContactForm('arcade')`). Success: confetti and a `SENT` stamp. |

## How the interactions work

- **Drag cards:** `motion` `drag`, `dragElastic 0.12`, momentum with the brief's `dragTransition`. Tilt is `clamp(velocity / 60, ±12)` through a spring. `whileDrag` scale 1.04 and the shadow grows from 6 px to 12 px (class swap, not tweened). A drag never counts as a click. Focused cards move 8 px per arrow key (32 px with Shift).
- **Spring pile:** `Tidy up` and `Shuffle` animate each card's x, y and rotation with a spring (stiffness 300, damping 26). Shuffle moves cards between grid slots visually. The DOM and tab order never change.
- **Cursor toys (desktop, fine pointer, no reduced motion):** toy box button or keys `1 2 3`. 1 = pointer (ink arrow that squishes on click), 2 = stamper (max 30 stickers, oldest fades), 3 = gravity (hand-rolled: `vy += 2200·dt`, restitution 0.55, friction 0.9, sleep below 30 px/s, max 40 bodies). `Esc` clears all. A "Plain cursor" switch turns the custom cursor off. The native cursor always stays over fields, dialogs and games.
- **Coins and achievements:** 13 achievements (one secret). Coins come from visiting sections, dragging, flipping, games and secrets. State lives in `localStorage` (`funky:arcade:save`). Toasts use `role="status"`.
- **HIRE ME unlock:** a score target in a game (20, Server Stack 10) unlocks a `HIRE ME` sticker on the cabinets that links to Contact.
- **Konami code** (up up down down left right left right B A): hue rotates the whole palette (oklch relative colours, so contrast holds) and fires confetti. Pressing it again swaps back. Off with reduced motion.
- **Sound:** off by default. WebAudio square-wave blips on button press, coins, and a short jingle. Never autoplays.
- **Marquees:** speed and direction follow scroll velocity (GSAP ticker, eased 0.3 s). Static single line with reduced motion.
- **Slab slam:** content enters with `y 60 → 0`, `rotate 2 → 0`, `back.out(1.7)`, once, when its top crosses 85% of the viewport (IntersectionObserver plus GSAP).
- **Analytics:** events from `hiring-clarity.md` section 10 fire as `window` `CustomEvent('funky:track')` with `variant: 'arcade'`. No network call, no cookies.

## What I tested

Environment: the shared dev server returned 500 several times because of other sessions' unfinished files (orbit, darkroom). I tested in an isolated APFS clone of the repo (other variants stubbed), and finished with a run on the shared server `:3000`. Browser: headless Chromium through Playwright (real 60 fps) and the built-in browser pane.

- **Widths 390, 768, 1280, 1920:** scrolled the whole page at each and took section screenshots. No horizontal overflow (only the off-screen honeypot input). No console error or warning at any width, on dev and on a production build.
- **Touch (390, CDP touch events):** deck swipe, `Next card`, tap-to-jump, sticker drag by touch, vertical page scroll that starts on a project card (not trapped), menu, Shuffle, case study open and close, polaroid flip, game start.
- **Every control:** nav pills, Resume, Menu, coin pill and achievements dialog, sound toggle, all hero actions, Shuffle (hero and projects), Tidy up, case-study dialog (Esc, close button, focus returns to the opener), All work, game cabinets (Insert coin, Reset cabinet, Full screen link), mini cabinet dialog, polaroid flip, build log, skill filters, Copy email (feedback in about 40 ms, clipboard checked), footer links.
- **Contact form:** invalid (three field errors, `aria-invalid`, typed text kept, email fallback shown) and valid (SENT stamp, confetti, fields cleared). One real test message was sent: name `QA Test`, `qa-test@example.com`. **Delete it from the CMS inbox.**
- **Toys:** stamper (3 stamps, `Esc` clears), gravity (cards rest on the viewport floor, spring home on toggle-off), cursor hidden over fields, Konami (palette swap, toasts).
- **Reduced motion:** no veil, no toy box or cursor, marquee is one static line, cards upright in a clean grid, project pile is a tidy grid, Konami off, drag still works without overshoot.
- **Keyboard:** skip link works, every control shows a 4 px focus ring, arrow-key nudge works.
- **Data edge cases:** all arrays empty (hero, about and contact still render, empty sections vanish, no error) and very long names, text and email (fixed one overflow in the ID card).
- **Typecheck:** `npx tsc --noEmit` for the whole repo currently stops at a syntax error in another variant (`src/variants/os/terminal/commands.tsx(439,27)`), so it never reaches type errors. I typechecked my folder with a temporary tsconfig that includes only `src/variants/arcade/**`: clean.
- **Static checks:** no duplicate ids, no unnamed controls, one `h1`, headings in order, text contrast above the limits for all checked text. The Impeccable detector reported only the intended `back.out` overshoot easing (the brief asks for it) and one false positive (a CSS chevron drawn with two borders).

### Measured (production build in the clone, 4G and 4× CPU for mobile)

| Metric | Mobile | Desktop |
|---|---|---|
| LCP | 0.95 s | 0.24 s |
| CLS | 0.009 | 0.032 |
| TBT | 54 ms | 0 ms |
| JS transferred (first load, includes React and Next) | 258 KB, 10 files | same |
| CSS / fonts | 19 KB / 159 KB (4 files) | same |

Games, `motion` drag code and GSAP are not render-blocking; game chunks load only after Insert coin. I did not run Lighthouse (not installed, and I may not install packages).

## Bugs found and fixed during testing

1. **Native link drag cancelled card drags.** A card that contains an `<a>` started Chrome's own drag-and-drop, so the card stopped following the pointer. Fixed with `onDragStartCapture` + `-webkit-user-drag: none`.
2. **Async `LazyMotion` features overwrote motion values.** Motion builds each element after hydration and resets style motion values, so the fly-in start offsets and the reduced-motion reset were lost. Now `domMax` is a normal import. (Other variants that use `LazyMotion` with async features may hit the same bug. See the hand-over note.)
3. **Layout shift (CLS 0.13 to 0.23)** when the display font swapped in and the H1 re-wrapped. The H1 now has two fixed lines.
4. **Gravity read stale DOM rects** and could throw cards far off screen. It now tracks positions from the motion values.
5. `next/image` rejected the absolute CMS media URLs. `Pic` uses the same-origin path.

## Deviations from the brief (and why)

- **Games:** the brief asks for two built-in games. The shared games session delivered all 8, so the cabinets use `GameEmbed` (Bug Squash and Server Stack inline, the rest in a dialog). No game code is mine. Each shared game shows its own `Play` button after Insert coin.
- **Section order:** Play comes right after Work (owner wants games front and center). Nav order: Work, Play, Photos, Lab, Contact, Resume.
- **No Lenis, no ScrollTrigger:** native scroll (hiring-clarity prefers it) and an IntersectionObserver save about 20 KB of JS. GSAP core still drives the veil, the H1 word slam, the slam and the marquees.
- **Keyboard drag:** arrow keys nudge a focused card. `Space` is not "pick up and drop" because on a button it must keep its normal action.
- **Ink buttons** use a cream plate with an ink edge as their hard shadow (an ink shadow on ink is invisible).
- **Resume date** ("Updated Nov 2026") is not shown: the CMS has no date for the file.
- **Impeccable `init`** was skipped (no PRODUCT.md, and I was told not to ask anyone). The arcade brief served as product and design truth.

## Known issues and risks

- Tested touch through emulation (CDP touch events), not on a physical phone.
- In a hidden browser pane, animation frames run at about 1 fps (the intro and physics then look stuck). Real tabs are fine.
- The demo images are placeholder art; the Instagram, LinkedIn and X URLs in the seed are placeholders.
- Arrow keys during the Konami code also scroll the page (native behaviour, left as is).
- The fixed toy-box button can sit on top of footer text on desktop.
- Placeholders from the owner's CMS: alt text for the avatar comes from the CMS; if it is empty the name is used.
