# Builder contract (binding — overrides any conflicting path or name in `docs/research/*`)

Stack: Next.js 16 (App Router, Turbopack) + Payload CMS 3.94 + MongoDB. Node 24. Tailwind v4 is available (`@import 'tailwindcss'` is already in the frontend layout).
Installed and allowed libs: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`, `gsap` (+ `@gsap/react`, all bonus plugins are free and ship in the `gsap` package: ScrollTrigger, SplitText, Flip, DrawSVGPlugin, MotionPathPlugin, Observer, InertiaPlugin…), `lenis`, `motion` (import from `motion/react`), `clsx`, `zod`. **Do not install packages.** If something is truly missing, say so in your final report.

## Where things live

| Thing | Path | Owner |
|---|---|---|
| Variant root (default export, `'use client'`) | `src/variants/<name>/index.tsx` | that variant's session |
| Everything else for a variant (components, fonts, css, shaders, gsap setup) | `src/variants/<name>/**` | that variant's session |
| Mini-games | `src/games/<key>/**`, `src/games/registry.ts`, `src/components/games/**`, `src/app/(frontend)/games/**` | games session |
| Route that renders a variant | `src/app/(frontend)/[variant]/page.tsx` | orchestrator — do not edit |
| Data layer / types | `src/lib/content.ts`, `src/lib/types.ts` | orchestrator — read only |
| Contact form logic | `src/components/contact/useContactForm.tsx`, `src/app/actions/contact.ts` | orchestrator — read only |
| CMS schema | `src/collections/*`, `src/globals/*` | orchestrator — read only |

**Edit only files you own.** Never import from another variant's folder. Never run `git` commands that change state (no commit, checkout, stash, reset). Never run `next build` or `npm install` — another session's dev server shares `.next`.

## Variant component contract

```tsx
'use client'
import type { SiteData } from '@/lib/types'
export default function OrbitSite({ data }: { data: SiteData }) { ... }
```

- The route renders it at `/<name>` (orbit, darkroom, blueprint, arcade, os). It is loaded with `next/dynamic`, so your JS, CSS and fonts load only on your route.
- `data` is plain JSON: `data.settings` (name, handle, tagline, roles[], shortBio, longBio, location, timezone, avatar, resumeUrl, availability{status,note}, stats[], publicEmail, socials[], instagram{handle,url,followers,pitch}, seo), `data.projects[]`, `data.photos[]`, `data.games[]`, `data.hardware[]`, `data.skills[]`, `data.experience[]`. See `src/lib/types.ts` for exact fields. In the research briefs, "profile" means `data.settings`.
- **No new routes.** Case studies / project details open in-page (modal, drawer, expanded card, or a window in /os). Deep-link them with a hash (`#project-<slug>`) if you like.
- Fonts: declare with `next/font/google` in `src/variants/<name>/fonts.ts`, use `display: 'swap'`, apply `.variable` classes on your root wrapper `<div data-variant="<name>">`. Put tokens on that wrapper (not `:root`, since the html element is shared).
- Styles: CSS Modules (`*.module.css`) or Tailwind classes, or both. Global selectors must be scoped under `[data-variant="<name>"]`. Set your page background on your wrapper (min-height 100dvh) — `body` is shared and dark (#0a0a0a).
- Images: CMS images come as `Img` (`url`, `width`, `height`, `alt`, plus `thumb` 480w / `card` 960w / `hero` 1920w webp and `blur` base64). Use `next/image` (`src={img.card ?? img.url}`, `placeholder={img.blur ? 'blur' : 'empty'}`, `blurDataURL={img.blur}`, real `sizes`). For three.js textures load `img.card` or `img.thumb` (same origin).
- Resume: `data.settings.resumeUrl` (PDF) — link with `download`.
- Instagram CTA: `data.settings.instagram.url` / `.handle` / `.pitch`; per-photo `photo.instagramUrl`.

## Contact form (required in every variant)

```tsx
import { useContactForm } from '@/components/contact/useContactForm'
const { state, formAction, pending, hiddenFields } = useContactForm('<name>')
<form action={formAction}>
  {hiddenFields}
  <input name="name" required /> <input name="email" type="email" required />
  <input name="topic" /> <textarea name="message" required minLength={10} />
  {state?.fieldErrors?.email && <p role="alert">{state.fieldErrors.email}</p>}
  <p aria-live="polite">{state?.message}</p>
  <button disabled={pending}>Send</button>
</form>
```
The server action validates, rate-limits, stores the message in the CMS inbox and emails the owner. Style it your way; keep labels and errors accessible. (In dev, sending works; avoid spamming it — 1-2 test sends max.)

## Mini-games (required: every variant shows the games)

Do not write your own games. Embed the shared ones:
```tsx
import { GameEmbed } from '@/components/games/GameEmbed'
<GameEmbed game={g.component} title={g.title} className={styles.gameFrame}
  poster={(start) => <button onClick={start}>Play {g.title}</button>} />
```
- Size the frame from outside (width + height or aspect-ratio). The game fills it. Nothing loads until Play.
- Theme games via CSS vars on any ancestor: `--game-bg`, `--game-fg`, `--game-accent`, `--game-accent-2`, `--game-muted`.
- Full-page game route exists at `/games/<slug>` (link to it as "open full screen").
- Game keys: bug-squash, commit-snake, deploy-dash, shutter-snap, circuit-flow, hotfix-typer, orbit-sling, server-stack. The games session is building them right now; until it finishes, a stub renders "coming soon". That is expected.

## Speed (non-negotiable — "light-speed")

- First paint must not wait for three.js, GSAP plugins or games. Load heavy pieces with `next/dynamic(() => import(...), { ssr: false })` or on interaction/visibility.
- Server-render real text content (SEO + no blank screen). Animations enhance already-visible content; never ship content hidden behind JS that fails.
- DPR clamp `[1, 1.75]` for canvases; pause rAF loops off-screen and on `visibilitychange`; dispose three.js resources on unmount; `gsap.context().revert()` on unmount.
- Prefer CSS transforms/opacity. No layout-thrashing animations.

## Mobile + quality (owner requirement: "test every element so nothing breaks")

- Design mobile layouts deliberately (390px) — not scaled desktop. Touch targets ≥ 44px. No horizontal scroll at any width (use `overflow-x: clip`).
- `prefers-reduced-motion`: provide the reduced fallback from your brief.
- Keyboard: every control reachable and visible on focus; Esc closes overlays; focus is trapped in modals and restored on close.
- **Test before you finish** with the browser tools (Playwright MCP `mcp__plugin_ecc_playwright__*` or the built-in browser `mcp__Claude_Browser__*`) against the shared dev server at `http://localhost:3000/<name>`:
  - 390×844, 768×1024, 1280×800, 1920×1080 screenshots; scroll the whole page at each.
  - Click every button/link/card/tab, open/close every overlay, submit the contact form once with invalid data (see errors) and once valid.
  - Console must be free of errors and hydration warnings caused by your code.
  - `npx tsc --noEmit 2>&1 | grep 'src/variants/<name>'` must print nothing (ignore other folders' errors).
- If `http://localhost:3000` is down, check with `lsof -iTCP:3000 -sTCP:LISTEN` and only then start `npm run dev` yourself.

## Content rules

- Content comes from `data` — never hardcode the owner's name, bio, projects, etc. Section labels and UI microcopy are fine to write.
- Never invent metrics, clients or testimonials beyond what `data` holds. Hide empty slots.
- It is demo content now; the owner will replace it via the CMS at `/admin`. Your design must survive longer/shorter text, 0-20 items, missing images.

## Finish

End with a short report: what you built, how each interaction works, what you tested (widths, flows), known issues. Write the same report to `docs/reports/<name>.md`.
