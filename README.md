# codedbyfunky.com

Personal portfolio of **funky** — software engineer, photographer, web-game maker and hardware tinkerer.

Five complete design directions share one CMS and one codebase:

| Route | Direction |
|---|---|
| `/orbit` | Three.js scroll walkthrough — fly a camera through stations of work |
| `/darkroom` | Photography-led editorial under a red safelight |
| `/blueprint` | Engineering drawing sheet: PCB traces, exploded views |
| `/arcade` | Loud neo-brutalist playground, games everywhere |
| `/os` | FunkyOS — a desktop in the browser with a working terminal |
| `/games/<slug>` | 8 original mini-games, full screen |
| `/admin` | Payload CMS |

## Stack

- **Next.js 16** (App Router, Turbopack) — pages are ISR: rendered on first visit, cached, and purged by CMS hooks on every edit. No database access needed at build time.
- **Payload CMS 3** inside the same app, **MongoDB** storage.
- Each design variant is its own lazily-loaded client bundle (JS, CSS, fonts); three.js and every game load only when needed.
- three.js / React Three Fiber, GSAP (+ScrollTrigger, SplitText, DrawSVG), Lenis, Motion, Tailwind v4.

## Local development

```bash
docker run -d --name portfolio-mongo -p 127.0.0.1:27018:27017 -v portfolio-mongo-data:/data/db mongo:8.0
cp .env.example .env   # fill values
npm install
npm run seed           # demo content + test editor account (credentials written to docs/private/, gitignored)
npm run dev
```

- `npm run seed -- --fresh` — wipe content + media and seed again
- `npm run seed -- --wipe` — remove all demo content and `*.test` users (keeps the admin). Run this before entering real content.

## Content model

`Site settings` (identity, links, Instagram, resume, SEO) · `Projects` · `Photos` · `Games` · `Hardware projects` · `Skills` · `Experience` · `Media` · `Messages` (contact inbox) · `Users`.

Variants never talk to Payload directly; they get one typed `SiteData` object (`src/lib/types.ts`) from `src/lib/content.ts`.

## Security

- Anonymous visitors can read only published content. `users` and `messages` are never public; GraphQL is disabled.
- No open sign-up: the first admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on boot, closing Payload's "create first user" window. Login lockout after 5 failed attempts.
- Contact form is a server action: zod validation, honeypot, time trap, per-IP and global rate limits, HTML-escaped mail. Messages land in the CMS inbox even if mail fails.
- Uploads: raster images, video, PDF only (no SVG → no stored XSS).
- Strict security headers (CSP, HSTS, frame, referrer, permissions).
- Database user `portfolio_app` has `readWrite` on the `portfolio` database only; MongoDB has no public port.

## Deploy

Dokploy builds `Dockerfile` from `main` on every push. Environment lives in Dokploy (never in git). Uploaded media persists on the `portfolio-media` volume.
