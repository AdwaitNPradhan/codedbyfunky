# Games report

Status: DRAFT — written while the six forked games were still being tested. Final numbers are filled in at the end.

## What was built

- Eight canvas mini-games under `src/games/<key>/Game.tsx` (each its own lazy chunk through `src/games/registry.ts`).
- One shared host, `src/games/_shared/GameShell.tsx`, that every game uses. A game only implements `create(env) → Game`.
- `GameEmbed` (poster → lazy chunk → game, fullscreen, error boundary with retry).
- `/games` index page and a polished `/games/[slug]` page.

## Shared architecture (`src/games/_shared/`)

| File | Role |
|---|---|
| `GameShell.tsx` + `shell.module.css` | canvas, DPR clamp ≤ 2, ResizeObserver, rAF loop, pointer + keyboard routing, HUD, start / pause / game-over overlays, best score, focus handling |
| `engine.ts` | `Env`, `Game`, `GameMeta`, `Pt` types (the game API) |
| `fx.ts` | particles, floating text, rings |
| `color.ts` | reads `--game-*` vars from the container, resolves any CSS colour to rgb for alpha use |
| `sfx.ts` | tiny WebAudio synth, **muted by default**, toggle in the HUD |
| `storage.ts` | best score in `localStorage` (try/catch) |
| `math.ts`, `draw.ts` | easing, PRNG, rounded rects, glow |

## Behaviour shared by every game

- Fills its container 100%; re-lays out on resize; DPR ≤ 2.
- Theme: `--game-bg / fg / accent / accent-2 / muted` read from the container (fallbacks built in). Font is inherited (canvas text uses the container's computed font-family).
- Keyboard events are listened to on the game root only, so keys are captured (and `preventDefault`ed) only while the game has focus. Esc / P pauses. Enter, Space or R restarts from game over.
- The loop stops and the game auto-pauses when the tab is hidden or the frame scrolls off-screen. Everything is removed on unmount.
- Screen shake and most particles are reduced or off under `prefers-reduced-motion`.
- Touch: tap-only games use `touch-action: pan-y` so the page can still scroll over the frame. Drag/hold games use `none`.
- Overlays use container queries, so the start card shrinks (and hides the how-to list) in small frames.

## Games

_(filled in below once all forks report)_

## Testing

_(filled in below)_
