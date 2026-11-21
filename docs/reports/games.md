# Games report

Eight original canvas mini-games, one shared host, a `/games` index and a polished `/games/[slug]` page.
No new packages. No git state changes. Nothing committed.

## Files

| Area | Path |
|---|---|
| Shared host + helpers | `src/games/_shared/` (`GameShell.tsx`, `shell.module.css`, `engine.ts`, `fx.ts`, `color.ts`, `sfx.ts`, `storage.ts`, `math.ts`, `draw.ts`) |
| Games (each its own lazy chunk via `src/games/registry.ts`) | `src/games/<key>/Game.tsx` (+ `orbit-sling/physics.ts`) |
| Embed | `src/components/games/GameEmbed.tsx` + `GameEmbed.module.css` |
| Pages | `src/app/(frontend)/games/page.tsx`, `games/[slug]/page.tsx`, `games/games.module.css`, `games/localSrc.ts` |

## Architecture

A game implements `create(env) → { reset, resize?, update, render, pointerDown/Move/Up?, key?, destroy? }` and renders `<GameShell meta create />`.
The shell owns everything else:

- Canvas fills the container 100%. `ResizeObserver`. DPR clamp ≤ 2 (390×844 at DPR 2 gives a 780-wide backing store).
- rAF loop. It stops and the game auto-pauses on `visibilitychange` hidden and when the frame scrolls off-screen. Everything is removed on unmount.
- Theme: `--game-bg / fg / accent / accent-2 / muted` read from the container (any CSS colour is resolved to rgb through a 1px canvas, so `oklch`, `color-mix` etc. work). Font is inherited.
- Input: pointer events on the canvas. Keyboard listeners sit on the game root only, so keys are captured only while the game has focus. Space and game keys are `preventDefault`ed while focused in every state (fix found during E2E: Space used to scroll the page during the game-over delay). Esc and P pause. Enter, Space or R restart from game over (after a 0.7 s guard so mashing does not skip the score).
- HUD (score, best, pause, sound), start card with how-to-play, pause card, game-over card with count-up score and "New best" badge. Overlays use container queries, so they shrink in small frames.
- Best score in `localStorage` (try/catch). `onScore` fires on every change, `onGameOver` once per run.
- Juice: easing, particles, floating text, rings, screen shake. Shake is off and particles are cut to 40 % under `prefers-reduced-motion`; overlay animation is disabled.
- Sound: synthesized WebAudio, **muted by default**, toggle in the HUD, choice stored.
- Tap-only games use `touch-action: pan-y` (the page can still scroll over the frame). Drag and hold games use `none`.

`GameEmbed` (props are backward compatible; `autoStart` is new and optional): poster, then lazy chunk, loading state, error boundary with "Try again", fullscreen toggle (hidden where unsupported, e.g. iPhone), and `--game-hud-inset` so the in-game HUD buttons never sit under the fullscreen button.

## The games

| Key | Mechanic | Controls |
|---|---|---|
| `bug-squash` | Bugs (beetle, sprinter, 2-hit tank) crawl over a scrolling fake code editor toward a PROD gate. Green "feature" decoys must not be squashed. Combo multiplier up to ×8. 3 lives; a bug that reaches PROD ships. Speed and spawn rate ramp. | click / tap; Space squashes the nearest bug; P / Esc |
| `commit-snake` | Branch snake on an adaptive grid. Commit dots grow it. Rare merge pickups give +50, trim the tail and give 3 s ghost mode. Walls are conflict-marker strips; red conflict blocks arm as you eat. Smooth interpolated motion, 2-deep input queue. | arrows / WASD; swipe (mid-drag) |
| `deploy-dash` | Runner along a CI pipeline with parallax stage nodes. Jump failing builds, duck flaky-test drones, collect green checks. Variable jump height, coyote time, jump buffer, speed ramp. | Space / ↑ / W / tap; ↓ / S / hold bottom third / swipe down to duck |
| `shutter-snap` | Viewfinder with thirds grid. A procedural subject (plane, bird, cyclist, runner) crosses the frame. Hold to pull focus (blur → sharp), release to shoot. Score = sharpness + thirds alignment + perfect bonus. Polaroid "develops" per shot; 8-frame roll; contact sheet at the end. Blur is ghost copies + glow (no `ctx.filter`, so it works in Safari). | hold pointer / Space |
| `circuit-flow` | Tile-rotation puzzle, battery to LED. Seeded, solvable, scrambled levels from 5×5 up to 9×9 (fits the container). Current flows along powered traces; solving pulses the circuit and advances. 90 s clock, +25 s per level. Idle hint after 12 s. | tap / click rotate; right-click / Shift reverses; arrows + Space / Enter / R |
| `hotfix-typer` | Code tokens fall toward PROD. Type them (prefix-lock, combo, typo penalty). 3 lives; speed ramps. On touch a canvas-drawn word picker (≥ 48 px chips, lowest token first) replaces the keyboard. | keyboard; tap chips on touch |
| `orbit-sling` | Slingshot a probe through gravity wells to a beacon. Real-integrator trajectory preview. 10 hand-built levels (brute-force solver confirms each is solvable) then generated ones; moving wells and hazard walls later. 3 probes per level. Portrait rotates the play space 90°. | drag and release; or ← → aim, ↑ ↓ power, Space launch |
| `server-stack` | A rack server slides; drop it. Overhang is trimmed and falls away. Perfect landings keep width and build a streak; 3 in a row grows the unit back. Camera follows the tower; 10U milestones. | click / tap / Space / ↓ |

## Pages

- `/games`: hero, card grid with cover images (`next/image`), accent per card, hover lift, mobile one-column. `export const dynamic = 'force-dynamic'`.
- `/games/[slug]`: data loading unchanged (`revalidate = 86400`, `generateStaticParams → []`). The header plus game frame fill exactly one viewport (`100dvh`, also on mobile and landscape phones); an About block and "More games" grid sit below the fold. The game loads right away (`autoStart`) and shows its start card. Open Graph image from the cover.
- CMS cover URLs are absolute (`http://host/api/media/...`) and `next/image` rejects them without `remotePatterns`. `games/localSrc.ts` strips the origin. Variants that use `next/image` on `game.cover` will hit the same error.

## Tests run

Real routes, headless Chromium (repo's `playwright`), shared dev server. Script and montages are in the session scratchpad (`e2e.cjs`).

For each of the 8 games, at 1280×800 (mouse + keyboard) and 390×844 (DPR 2, real touch events, swipes and holds through CDP):

1. Load `/games/<slug>`, check start card, no horizontal overflow, card not clipped, backing store ≤ 2× CSS size.
2. Click Play, play with scripted input, pause (Esc on desktop, HUD button on mobile), confirm the canvas is frozen while paused, resume.
3. Desktop: scroll the frame off-screen and back → game auto-pauses (checked on all games that were still alive; two pages are 16 px shorter and the frame never fully leaves view there, which is expected).
4. Play to game over, check the card, click "Play again", check best score stored.

Result: **16/16 pass, 0 console errors, 0 hydration warnings.** Extra checks: reduced-motion context, client-side navigation index → game → index four times (0 canvases left, 0 errors), Space does not get captured when the game is not focused, `/games` has no horizontal overflow at 390 / 844 / 1280. `npx tsc --noEmit | grep -E 'src/games|src/components/games|src/app/\(frontend\)/games'` prints nothing.

Embed smoke test: darkroom (desktop + mobile), blueprint (mobile), orbit (desktop + mobile) load the game from their poster with no console errors. The arcade and os variants have no generic "Play" button, so that check did not exercise them.

## Known issues / not done

- Real-device touch (iOS Safari, Android Chrome), Firefox and WebKit were not tested. Sound was not listened to.
- Dev-server theme changes at runtime are picked up on resize, start and tab-visible, not instantly.
- The shell does not forward right-click or Shift to games; `circuit-flow` reads them from its own canvas listener.
- No Lighthouse run. Game sources are 13–28 KB each (shipped chunk size not measured).
- The shared dev server was moved from port 3000 to 3101 during the session; tests ran against 3101.
