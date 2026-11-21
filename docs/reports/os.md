# Report: `/os` (FunkyOS)

Route: `http://localhost:3000/os`. All code is in `src/variants/os/**` (about 8,200 lines with CSS). Nothing outside that folder was edited, except this report.

## What it is

A retro-modern desktop in the browser. The first window answers who, what and how to contact. Every portfolio section is an app.

- Boot: black BIOS log with real stack names and real content counts, then a pixel logo with a 12-step bar, then a fade to the desktop. First visit 3.1 s. Repeat visit 0.65 s. Phone 1.4 s. Reduced motion 0.3 s. Any key, click or the `Skip intro` button fast-forwards.
- Desktop: pixel-art wallpaper (3 stepped hill layers, a striped sun, dither, scanlines, pointer parallax), menu bar with clock, sound toggle, `Resume` link and an accent `Hire me` pill, 10 desktop icons, dock with magnification.
- Apps: About (README.txt, opens on boot), Files (Projects, Photos, Games, Hardware, Documents), Preview (case study), Photos, Games (library) and one window per game, Lab (hardware), Skills (skills table and experience timeline), Terminal, Mail, Resume.pdf, Settings.
- Recruiter clarity: the About window says who, shows availability, location, roles, the CMS tagline and three buttons (`Open projects`, `Resume`, `Hire me`). Below are the email with a copy button, GitHub, LinkedIn, Instagram, CMS stats, an experience accordion and a `plain page` link. `Hire me` and `Resume` stay in the menu bar all the time.
- Plain page: `FunkyOS menu → Switch to plain page`, the skip link, the About window, Settings and `/os?plain=1` all show the same content as a normal page (one `h1`, sections for projects, photos, games, hardware, skills, experience, contact). With JavaScript off, that same content shows. The server-rendered HTML always contains it, hidden with `clip` (not `display: none`).

## How the interactions work

| Area | Behaviour |
|---|---|
| Windows | `role="dialog"` with `aria-labelledby`. Drag by the title bar. 8 resize handles (min 320×220, rAF batched). Drag to the left or right edge snaps to a half, drag to the top edge maximises, dragging out restores the old size. Double-click the title toggles maximise. Minimise flies the window to its dock icon (windows without a permanent dock slot get a temporary one). Open and close use the springs from the brief. Z-order on click, on focus and with `Alt+Tab`. Focus moves into a new window and returns to the dock icon on close. |
| Keys | `Cmd/Ctrl+K` or `/` opens the palette (fuzzy search over apps, projects, games, hardware, photos, skills, commands). `Esc` closes the palette, then the context menu, then the focused window. Apps that use `Esc` (photo viewer, quick look) call `preventDefault` first. Menus use arrows, Home, End and `Esc`. |
| Desktop icons | Single click selects, double-click or `Enter` opens. Drag with a 96 px grid snap. Rubber-band selection. Arrow keys move focus (one Tab stop). Right-click menu: change wallpaper, change accent, Open Terminal, About, palette. Positions persist for the session. |
| Dock | `scale = 1 + 0.5 cos(clamp(dist/120)·π/2)` with spring 320/24/0.7. Tooltip after 150 ms. Dot for running apps (hollow when minimised). Fixed size with reduced motion. |
| Terminal | Quote-aware parser. Commands: help, about, whoami, neofetch, projects [--stack x] [n], open, ls, cd, pwd, cat, photos, instagram, games, play, hardware, skills, exp, contact, email, github, linkedin, resume, theme, sound, clear, history, date, echo, sudo, exit. Easter eggs: `sudo hire funky` (opens Mail with subject `Let's talk` and pixel confetti), `fortune`, `cowsay`, `rm -rf /`, `vim`, `shutdown`. `Tab` completes commands, slugs and file names. `↑/↓` history (50). `Ctrl+L` clears. `Ctrl+C` cancels. Output is an `aria-live` log. Items in lists are clickable. |
| Photos | Album select, thumbnail grid, **`Open Instagram @handle`** accent button, viewer with prev/next, slideshow (3 s, pauses on hover and when minimised), `i` for EXIF, wheel/pinch/double-click zoom with pan. |
| Games | Library with covers. `Play` opens the shared `GameEmbed` in its own window, with `--game-*` vars from the CMS accent and a link to `/games/<slug>`. Minimising a game window unmounts it, so its loop stops. Restoring shows the Play poster again. |
| Mail | `useContactForm('os')`. Fields: name, reply-to email, subject, message. Server errors show per field (`role="alert"`, `aria-invalid`). Typed text stays on error. Success slides the form up (the swoosh) and shows a confirmation. Copy-email button confirms instantly. |
| Settings | Wallpaper (3), accent (4), reduce motion, sound. Saved in `localStorage`. Window layout is saved in `sessionStorage`. |
| Deep links | `/os?app=terminal`, `/os?app=files&path=projects/<slug>`, `#project-<slug>` (also updated when a case study is focused). |
| Shutdown | `FunkyOS menu → Shut down`: CRT collapse (0.4 s), black (0.6 s), reboot with the full boot. |
| Sound | Off by default. WebAudio chime, click, error blip. Never autoplays. |

### Mobile (under 768 px, or touch with up to 1100 px)

FunkyOS Touch: a status bar (clock and `Hire me`), a `Quick view` welcome card (who, availability, `Projects`, `Resume`, `Contact`, email + copy, plain page link), a 4-column home grid and a 4-tab bar (About, Projects, Photos, Terminal). Apps open as full-screen sheets (`y 100% → 0`). Close with `Back`, `Esc`, or by dragging the header down (offset over 120 or velocity over 500). Files open on a single tap. Terminal shows quick-command chips. Sheets follow `visualViewport`, so the keyboard does not cover them.

## What was tested

Tool: Playwright (Chromium, headless, local scripts) against the shared dev server, plus a look at the built-in browser.

- Widths: 390×844 (touch, DPR 2), 844×390 landscape phone, 768×1024 with mouse (desktop UI), 768×1024 with touch (phone UI), 1024×768, 1280×800, 1920×1080. No horizontal overflow at any of them.
- Every app opened and closed with `Esc` on desktop; every app opened and closed with `Back` on the phone.
- Window drag, resize (including the minimum), z-order, maximise and restore, double-click title, snap left, snap top, drag out of snap, minimise and restore, close and focus return, dock magnification, right-click menu, menus, icon double-click, rubber band, icon drag.
- Terminal: about 30 commands, completion, history, `Ctrl+L`, `Ctrl+C`, `sudo hire funky` (confetti and prefilled subject), `play`, `open`.
- Mail: invalid submit (3 field errors, text kept) and a valid submit (success view). On the phone: the invalid path.
- Photos viewer (arrows, info, wheel zoom, slideshow, `Esc`), Files (select, quick look, double-click, icon view, filter, sections), game window (poster, run, minimise, restore), resume download (About button and menu bar), settings persistence across reload.
- Palette, `/` shortcut, `Alt+Tab`, Tab order, plain page, back to desktop, shutdown and reboot, deep links.
- Boot timing: full 3.07 s to About, quick boot 0.66 s, skip by key 0.57 s. Reduced motion: About after 0.23 s, dock not magnified. JavaScript off: the content shows.
- Console: no errors and no hydration warnings in any run (one dev-only motion notice under reduced motion, fixed with `MotionConfig`).
- `npx tsc --noEmit 2>&1 | grep 'src/variants/os'` prints nothing.
- `impeccable detect`: one finding fixed (accent top border on a rounded card). One advisory left on purpose: the bounce easing `cubic-bezier(.34,1.56,.64,1)` is required by the brief for window open.

## Deviations from the brief

- Window drag uses pointer events that write `motion` values (`x`, `y`, `width`, `height`), not `motion`'s `drag` prop. Reason: snap zones and "drag out of snap restores size" need exact control. The phone sheets do use `drag="y"` with `dragControls`.
- The brief says Games runs the game inside the Games window. Here the Games window is a library and each game opens in its own window (as the task asked).
- No built-in Snake: the shared mini-games replace it.
- Terminal font on phone is 16 px, not 15 px. iOS Safari zooms the page when an input is smaller than 16 px.
- Skills table has columns Name, Kind, Level, Years. The CMS has no "used for" field.
- The server drops contact forms sent within 2.5 s after the form mounts (the bot trap in `contact.ts`). The `Send` button therefore stays disabled for the first 2.6 s, so a fast autofill and Enter is never lost silently.
- Hiring-clarity §10 analytics events are not emitted. The contract gives no endpoint.

## Known issues and not verified

- **Two test messages** named `Playwright Tester` were sent through the real contact action (limit was 1–2). They are in the CMS inbox and may have reached the owner's email. Delete them in `/admin`.
- The shared dev server returned 500 for a while because the orbit session had unfinished imports. This was not caused by `/os`.
- Resume preview uses an `<iframe>` (the CSP has `object-src 'none'`). If the PDF is later served with `Content-Disposition: attachment`, the preview will not render and the toolbar `Download` and the fallback link remain. The CMS has no resume date field, so `Updated <date>` is not shown.
- Headless Chromium has no PDF viewer, so the PDF preview was not seen rendered. The demo PDF is a placeholder.
- Not run: `next build`, Lighthouse, a bundle size check (the brief asks for ≤170 KB gz initial). Structure for it: the first chunk has the shell and About. Terminal, Files, Photos, Games, Lab, Skills, Mail, Resume and Settings load with `next/dynamic` on first open. `motion` uses `LazyMotion` with `domMax`. `backdrop-filter` is only on the menu bar, the dock and the mobile bars.
- Not tested on a real phone, Safari, Firefox, VoiceOver, or with audio output (sound was only checked for no errors). Pinch zoom in Photos is implemented but only wheel and double-click zoom were exercised.
- Plain page: `?plain=1` is read on the client (the route is ISR), so a visitor with JavaScript sees the boot screen for a moment before the plain page.
- Demo content: a few CMS fields are demo values (stats such as "6+ years shipping"). The UI shows whatever the CMS holds.

## Versions inside FunkyOS

FunkyOS is now the main site. The four earlier designs live inside it as "old versions" of the personal website. Scope: `src/variants/os/**` only (plus this report).

### What changed

- **Files.** One table drives everything: `versions.ts`. Names, notes and "last modified" dates are jokes (the dates are made up, not git dates). Change them there.

  | File | Route | Date |
  |---|---|---|
  | `prototype.html` (the blueprint) | `/blueprint` | 9 Mar 2025 |
  | `personal_website_v1.html` | `/darkroom` | 17 Aug 2025 |
  | `final.html` | `/arcade` | 2 Feb 2026 |
  | `final_final.html` | `/orbit` | 30 Oct 2026 |
  | `final_final_FINAL(2).html` (copy, only in the folder) | `/orbit` | 2 Nov 2026 |

  Each file has its own pixel icon (blueprint sheet, darkroom with red safelight, arcade joystick, orbit planet).
- **Where they are.** On the desktop, in the right-hand column: an `Old Versions` folder and the first four files, like files dropped on a messy desktop. In Files there is a new `Old Versions` section (list and icon view, sorted by date, newest first). On the phone the home grid has an `Old versions` tile.
- **New app `browser`.** File `apps/Browser.tsx`. One window per version (`browser:<key>`), so each file opens once and focuses when opened again. The window has:
  - a read-only address bar `codedbyfunky.com/<path>` that follows the page inside (it changes if the page goes to `/`);
  - `Back` (uses the Navigation API; a load counter is the fallback), `Reload`, `New tab` (opens the real route in a top-level tab) and `Maximize` (desktop only);
  - a same-origin `<iframe title="<file>: an earlier version of this website">` with a pixel loading screen (a bar, and a hint after 5 s);
  - the iframe exists only while the window is visible. Minimise drops it, so a heavy page (orbit is WebGL) stops running. Restore loads it again.
- **Window glue.** The title bar, the dock slot and the menu bar show the file name and the version icon (`iconOf` in `appmeta.ts`). A click inside the iframe raises the window (the iframe never sends a pointer event to the window frame, so the window listens for `blur`). `Ctrl/Cmd+K` pressed inside the iframe opens the palette. Dragging and resizing over the iframe works (pointer capture).
- **Other entry points.**
  - Palette: the five files and the folder.
  - Go menu: `Old Versions`.
  - Terminal: `ls` shows `old_versions/`; `cd old_versions`, `cat prototype.html`, a new `versions` command, and `open prototype | personal_website_v1 | final | final_final | blueprint | orbit | v1 | old versions`. `Tab` completes the file names.
  - Plain page: a short "Earlier versions of this site" list with plain links.
- **Deep links.** `/os?app=browser&v=blueprint|darkroom|arcade|orbit` and `/os?app=files&path=versions`. An unknown `v` opens the Old Versions folder. `os.open('browser')` without a version does the same.
- **No nesting.** `useFramed()` (`window.self !== window.top`, in a try/catch) is checked after mount. Inside an iframe the site shows `FramedScreen` instead of booting: "You are already inside FunkyOS." with a button `Open FunkyOS in the top window` (`<a href="/" target="_top">`). `Go back` appears only when the frame has its own history entry (`history.back()` inside an iframe can leave the parent page). The screen does not mount the desktop, the windows or the boot, and it follows the saved wallpaper and accent.
- **Browser windows are not restored after a reload.** Everything else still is. A reload would start several full old sites (one is WebGL) at once.
- **Two small fixes found on the way.**
  - The pixel font draws the `fi` ligature as a capital A, so `final.html` read "Anal.html". Ligatures are now off in the whole OS (`.root *`, `.plain *`).
  - Desktop icon captions allow 3 lines (long file names were cut), and the caption no longer shrinks inside the 96 px cell.

### Tests

Tool: Playwright (headless Chromium) against the dev server on port 3101 (the one the orbit session runs).

- `npx tsc --noEmit`: no output (whole project). `npm run build`: passes (exit 0). ESLint cannot start in this repo (a circular config error in `@eslint/eslintrc`, not caused by this work), so lint was not run.
- 1280×800: 4 version icons and the folder on the desktop; open all four (by double-click and by palette); address bar, iframe title and `New tab` href are right; reload shows the loading screen, then the page; toolbar `Maximize`/`Restore`; drag and resize over the iframe; z-order when the iframe is clicked (z 13 → 15); `Ctrl+K` from inside the iframe; minimise drops the iframe (4 → 3) and restore brings it back; `Esc` after focusing the title closes the window; Files → Old Versions (5 rows, sorted); terminal `ls`, `cd old_versions`, `cat` (also the file with `(2)`), `versions`, `open final`, and a bad name.
- No nesting: the arcade iframe sent to `/` shows the screen (no windows, no boot, link `/` with `target=_top`); `Back` goes back to `/arcade`; the top page stays on `/os`. A bare `/os` loaded in an iframe on `/blueprint` also shows the screen.
- Deep links: `?app=browser&v=blueprint`, `?app=files&path=versions`, `?app=browser&v=bogus` (opens the folder). Reload does not restore browser windows.
- 390×844 touch (phone UI): `Old versions` tile → Files → tap a row → full-screen sheet, the iframe fills 390×744, the toolbar buttons are 44×44, no horizontal overflow, `Back` closes the sheet and removes the iframe, deep link works, the no-nesting screen fits.
- 768×1024 with mouse (desktop UI), 768×1024 with touch (phone UI), 1920×1080 (orbit), 1280×800 with reduced motion: windows open, no horizontal overflow.
- Console: no errors in any run. The only messages came from other variants: `THREE.Clock` deprecation and a WebGL "GPU stall" notice from orbit, and the motion library's dev notice about reduced motion from the arcade page.

### Open issues

- `Esc` pressed inside the iframe belongs to the old page. Click the title bar first, then press `Esc`. Only `Ctrl/Cmd+K` is forwarded.
- A version window that sits behind other windows keeps running. Only a minimised window drops its iframe. Four open versions (with orbit) are heavy on a weak GPU.
- A link to `/` inside an old version leads to the no-nesting screen (by design). The page still loads the FunkyOS JavaScript before it shows.
- On the phone the Files sidebar row scrolls sideways, so `Old Versions` is off-screen at first. Use the home tile.
- The "last modified" dates are fake.
- Not tested: a real phone, Safari and Firefox (the Back button uses the load-counter fallback where the Navigation API is missing), VoiceOver. `next build` ran while the shared dev server was up (Next 16 keeps dev output in `.next/dev`, and the dev server stayed healthy).

## More apps, installed products, 3D, the doomsday egg and the guestbook

Four follow-ups, built in order. After each one `npx tsc --noEmit` is clean and `npm run build` passes. Nothing is committed.

### New CMS collections and fields (add demo data to production by hand)

| Where | Field | Notes |
|---|---|---|
| Collection `posts` (group Content) | `kind` (select `blog` or `note`, default `blog`), `title`, `slug` (unique, `a-z 0-9 -`), `excerpt` (≤ 300), `body` (textarea, **markdown**, no raw HTML), `publishedAt` (date, default now), `tags` (text list), `cover` (upload), `featured`, `order`, `published` (default on) | Public API and pages see published posts only. Blog app shows `kind = blog`, Notes app shows `kind = note`. |
| Collection `guestbook` (group Inbox) | `name` (2–40), `message` (2–280), `sticker` (`star heart smile fire rocket coffee camera bug`), `approved` (default **off**), `ipHash` (read-only, never public) | Public read: approved entries only, and never `ipHash`. Create: nobody over the API (only the server action writes). Update: any signed-in user. Delete: admin. |
| Site settings > Links > `spotify` | `url`, `label` | `url` must be `https://open.spotify.com/(playlist\|album\|track\|artist\|episode\|show)/<id>`. Anything else hides the app. The embed URL is rebuilt on the server from the parsed kind and id. |
| Site settings > Fun (new tab) > `easterEggs.doomsday` | checkbox, default **on** | Kill switch for the `rm -rf /` easter egg. Off: the command does nothing and any active "outage" ends. |
| Site settings > Fun > `guestbook.autoApprove` | checkbox, default **off** | On: new guestbook entries show at once. |
| Projects > `appIcon` | upload | Square icon of the installed app. Falls back to `cover`. |

Demo data: `src/seed/seed.ts` now seeds the Spotify link (a public playlist), 3 blog posts and 4 notes (`DEMO_POSTS`, exported). A fresh deploy with `SEED_DEMO=true` creates them. For the live site, add them in `/admin` or copy from `DEMO_POSTS`. Other shared files touched (additive): `src/collections/content.ts` (Posts, `appIcon`), `src/collections/Guestbook.ts` (new), `src/globals/Site.ts`, `src/lib/types.ts` (`Spotify`, `Post`, `GuestEntry`, `Project.appIcon`, `SiteData.posts`, `SiteData.guestbook`), `src/lib/content.ts` (`parseSpotify`, mapping), `src/payload.config.ts`, `src/payload-types.ts` (regenerated), `next.config.ts` (CSP gets only `frame-src 'self' https://open.spotify.com`), `package.json` (`react-markdown`), `src/app/actions/doom.ts` and `src/app/actions/guestbook.ts` (new).

### Follow-up 1: Spotify, Notes, Blog, Media, Share

- **Spotify app.** The official embed in an iframe with `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"`. Music keeps playing when the window is minimised. On desktop, in the dock when configured. If the CMS link is missing or invalid the app is hidden.
- **Notes** (list and note, search, tags, one pane on narrow screens) and **Blog** (post list with cover and reading time, article reader, older and newer links). Both read the `posts` collection. Markdown goes through `react-markdown` in its own lazy chunk: no `rehype-raw`, no `dangerouslySetInnerHTML`, raw HTML is dropped, link and image URLs may only be http(s), `mailto:`, site-relative or `#anchor`, headings start at `h3` under the article's `h2`. Checked with a probe note (`javascript:` link, `<script>`, `<img onerror>`, `javascript:` image): nothing ran and nothing unsafe was rendered.
- **Media folder.** Files > Media lists the CMS photos as `.jpg` files (list, icons, quick look) and opens them in the Photos viewer. The CMS has no video field, so there are no videos yet. `Documents` now also lists posts as `.md` files.
- **Share on everything.** A Share button in every window title bar and in the phone sheet header; a right-click menu (Open, Share link) on desktop icons, dock icons and Files rows; a Share button in Files; a palette action. The link is `<NEXT_PUBLIC_SITE_URL or this origin>/?app=...`. `navigator.share` is used where it exists, otherwise the link is copied and a "Link copied" toast shows.
- **Deep links** are checked in `deeplink.ts`: `app` must be an own key of the app table; every other parameter must name something that exists in the CMS data (sets, so `__proto__` or `constructor` never match). Bad values open nothing (or the Old Versions folder for a bad version). Supported: `?app=files&path=<folder>[/<project>]`, `preview|product|game|lab|model&slug=`, `notes|blog&slug=`, `browser&v=`, `photos&photo=`, and the apps without parameters.

### Follow-up 2: products as installed apps, and 3D

- **Installed apps.** Every project is an app: Files > Applications (`.app` files), an `Applications` folder on the desktop, up to 3 featured projects pinned in the dock (not under 900 px width), and featured icons on the phone home screen. The window shows icon, summary, Launch, Repo, Case study, Share, facts, screenshots, details and stack. Launch shows a short "Launching…" splash, then opens the live link in a new tab (external sites refuse frames), with a manual link if the tab does not open. With no live link it offers the repo, or "Not live yet".
- **3D, all lazy and optional.**
  1. A low-poly 3D wallpaper (pixel-style, low resolution) that follows the cursor. It starts about 1.8 s after boot, only on a desktop with a mouse, enough CPU and memory, no data-saver and WebGL, not with reduced motion, and can be turned off in Settings. It pauses while a window is maximised or the tab is hidden.
  2. A 3D board viewer for hardware projects (Lab > View in 3D, or `?app=model&slug=`). It shows a real dev-board model (see "A real 3D model" below) with orbit and pinch controls, the project's part list next to it, auto-rotate off with reduced motion, simpler rendering on weak devices and phones, and a photo fallback without WebGL.
  3. Desktop icons tilt in 3D toward the mouse (mouse only, motion allowed).
  All 3D code is in separate chunks loaded with `next/dynamic`.

### Follow-up 3: resume in the terminal, and the doomsday egg

- `resume`, `cat resume.txt` and `whoami --verbose` print a formatted resume (summary, experience, education, skills by category, selected projects, contact) with the PDF link. `resume --pdf` downloads the PDF. `help` lists them.
- `rm -rf /` prints GNU's failsafe. `rm -rf / --no-preserve-root` without sudo gets "Permission denied". `sudo rm -rf / --no-preserve-root` (also `sudo rm -rf --no-preserve-root /`, `-fr`, `--recursive --force`) asks for a hidden password (any text works, Ctrl+C cancels), then runs the wipe.
- The wipe: about 230 `removed '<path>'` lines (real FunkyOS file names first), windows close, icons vanish, the dock collapses, the screen glitches, black, then a BIOS screen: "No bootable device found. Insert boot disk and press any key." with the reason, a restore countdown and a snarky line on any key or tap. Reduced motion: no scroll storm and no glitch, a short fade. When the countdown ends the system reboots into the normal boot.
- `src/app/actions/doom.ts`: `triggerDoom()` and `getDoom()`, state in memory (`doomUntil`, `lastTrigger`, with the "single container, resets on redeploy" comment). 1 hour, at most one trigger per 24 hours, a per-IP limit (3 per 10 minutes, 30 global), and it does nothing when the CMS kill switch is off. FunkyOS asks `getDoom()` once after hydration and shows the BIOS screen client-side, so the server HTML and the ISR cache stay normal. Only `/` and `/os` are affected. `/os?plain=1` and the "Switch to plain text version" link still work, on purpose (accessibility, and a recruiter can still read the site).
- `DOOM_DURATION_MS` and `DOOM_COOLDOWN_MS` exist only so a test can see a whole cycle in seconds. Leave them unset in production.

### Follow-up 4: guestbook

- Collection `guestbook` and the `signGuestbook` action (`src/app/actions/guestbook.ts`): honeypot, 2.5 s time trap, zod validation, links, domains and e-mail addresses rejected in `name` and `message`, control and zero-width characters removed, per-IP limit of 2 per hour plus a global cap of 50 per hour (check first, record only allowed requests), `ipHash` stored (never the raw IP), no e-mail sent.
- The app is a form (name, message with counter, 8 stickers) next to a wall of paper notes. Everything is drawn as plain text. After signing, the visitor sees their note at once, marked "pending approval" (or "just posted" when auto-approve is on), kept in `localStorage` until the approved wall contains it. Share link: `?app=guestbook`.

### Tests

Tools: Playwright (headless Chromium) against the dev server (port 3101) and, for the doomsday cycle and the guestbook limits, a production build (`next start`, port 3202) so the shared dev server's counters stay clean. Widths 390 (touch), 768, 1280 and 1920 for the main flows. Console: no errors in any run (only the orbit variant's `THREE.Clock` and WebGL notices, and the motion library's reduced-motion dev notice).

- Spotify embed loads (CSP clean), Notes, Blog, Files > Media and Applications, right-click menus, the title bar and sheet Share buttons (clipboard checked), all deep links including `__proto__`, `constructor`, unknown slugs and a bad app name.
- Installed apps: dock pins, Launch (popup opened), 3D wallpaper present after the idle delay and absent with reduced motion, on a phone and after turning it off in Settings; 3D board viewer on desktop, phone and with reduced motion; icon tilt matrix.
- Doomsday: resume commands, failsafe and permission steps, password prompt (masked, Ctrl+C), the whole wipe timeline (wipe steps 0 to 4, then BIOS), snark lines, reload stays dark, other routes stay 200, plain page works, restore after the countdown, 24 h guard message, per-IP limit, kill switch off (nothing happens), reduced motion (BIOS in 1.7 s), phone.
- Guestbook: empty wall text; Send disabled for the first 2.6 s; honeypot field hidden and not focusable; a form sent in under 2.5 s and a form with the honeypot filled both show a polite "Thanks" but save nothing; a link, a domain name in the name, an e-mail address and a one-letter name each show a field error and save nothing; two valid entries saved (`approved` false, `ipHash` of 16 characters, no raw IP); the third in the same hour is refused ("You signed a moment ago"); entries with `<script>` or `<b>` in the text show as literal text (nothing ran); pending notes survive a reload; anonymous `GET /api/guestbook` shows nothing until approval and never `ipHash`; anonymous `POST /api/guestbook` is 403; after approval the wall shows the entry once, without the pending mark, and the local copy is removed. The global cap of 50 per hour uses the same code as the per-IP check and was not exercised.

### Open issues

- The CMS has no video field, so the Media folder shows photos only.
- Posts travel in `SiteData` to every variant page (bodies included). A few dozen short posts are fine; a large archive should move to an on-demand fetch.
- The doomsday state is in memory: a redeploy ends it, and two containers would disagree (noted in the code).
- The 3D wallpaper adds a WebGL context on desktop. Weak devices and data-saver users do not get it, but there is no battery check.
- `/api/guestbook` shows approved entries to everyone (name, message, sticker, date) by design.
- Not tested: a real phone, Safari, Firefox, VoiceOver. The system share sheet (`navigator.share`) was not exercised in headless Chromium, which has none, so only the copy fallback was tested.


### Follow-up 5: desktop icon drag and drop (live bug), and the Instagram feed

**A. Icon drag and drop.** Reproduced and fixed in `shell/DesktopIcons.tsx`. Causes: the dragged icon was moved with a CSS transform that added its own position a second time (a jump on pick-up) and that fought with the animation library's transform; the drop snapped by pointer position, not by where the icon was; the grid let icons sit under the dock; saved cells were never re-checked after a resize.
- A click opens the item (any pointer; Shift or Ctrl click only selects). A drag moves it. The threshold is 4 px for a mouse and 8 px for touch. A drag release never opens anything.
- Dragging uses the CSS `translate` property from React state: no jump, and a short glide into the cell on release. Several selected icons move together.
- The grid is cols x rows of 96 px cells and stops above the dock and below the menu bar. A drop snaps to the nearest cell by how far the icon moved. On a collision the dragged icon goes to the nearest free cell. The icon cannot leave the grid while it is dragged.
- Cells the visitor chose are saved (`localStorage`, new key `funkyos.icons.v2`, so old broken data is ignored). The real layout is solved from them on every size change: nothing overlaps, nothing is lost, and the cells come back when the window gets bigger again.
- Desktop right-click menu: "Clean up icons" (back to the default layout) and "Sort icons by name".
- A click anywhere outside the icons clears the selection; opening an item clears it too.
- Tested with a real mouse and with CDP touch events: no jump on pick-up, drops land on grid cells, no overlaps, clamped at all four edges and over the dock, a drag release opens nothing, a click (even with a 2 px wiggle) opens, positions survive a reload and a resize round trip, sort and clean up.

**B. Instagram feed in the Photos app.**
- `src/lib/instagram.ts` (server only) uses the Instagram API with Instagram Login (`graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp`). Basic Display was shut down in December 2024. The account must be a professional (creator or business) account.
- The token is the admin-only Site field `instagram.accessToken` (field-level read and update access: admin only, so it is absent from every public API answer, from `getSiteData` and from the page HTML). If the field is empty it uses the `INSTAGRAM_ACCESS_TOKEN` env var. Tokens are never sent to the browser and never logged (only a status code is logged).
- Renewal: a long-lived token lasts 60 days. When the saved token is older than 7 days the site calls `refresh_access_token?grant_type=ig_refresh_token` and writes the new token back to the field (`instagram.tokenRefreshedAt` keeps the age; pasting a new token restarts the clock). Instagram refuses tokens younger than 24 hours, so a failed renewal is retried at most once an hour.
- `src/app/actions/instagram.ts`: `getInstagramFeed()` returns posts only. In-memory cache: 1 hour (5 minutes after a failure). Only `*.cdninstagram.com` and `*.fbcdn.net` image hosts and `instagram.com` links are accepted; other posts are dropped. The CSP `img-src` lists those two hosts.
- UI (`apps/InstagramFeed.tsx`): the Photos app shows an Instagram tab (grid, lightbox with caption and date, previous and next, "View on Instagram", Share, "Follow @handle" from `settings.instagram`) and a Library tab (the CMS Photos collection). Images are plain lazy `<img>` tags because the CDN links expire. With no token, or when the API fails, only the Library shows, as before. Share link: `?app=photos&id=<post id>` (the id must be 5 to 25 digits; an unknown id is ignored).
- Tested against a local fake of the API (`INSTAGRAM_API_BASE` accepts only `http://localhost` or `http://127.0.0.1`, for tests): 6 fake posts, 3 kept (a foreign image host, a foreign link host and a non-numeric id were dropped), renewal with the env token and the new token saved to the CMS field, one upstream media call for several page loads, no token in `/api/globals/site` or in the page HTML, no token fields for an anonymous read, a bad token and a missing token both fall back to the Library. Not tested against the real Instagram API (no token).

### A real 3D model in the viewer

- The generated board is gone. The hardware viewer now loads **Arduino Uno by M Ferrieu**, Creative Commons Attribution (CC BY), from Poly Pizza (https://poly.pizza/m/2BEJQybmqQT). Source file 2.48 MB, optimized with `npx @gltf-transform/cli optimize --compress meshopt --texture-compress webp --simplify false` to **296 KB**: `public/models/arduino-uno-v1.glb` (the `/models/*` cache header is already immutable). It loads with `useGLTF(url, false, true)`: meshopt only, no Draco, no KTX2, no CDN.
- Credit: `docs/CREDITS.md` and a visible link in the viewer window.
- It is one stand-in board for every hardware project (an Arduino Uno for an ESP32 build, for example). The part list beside it comes from the project. A project-specific model needs a file per project.

## Follow-up 6: a real Linux in the browser (Linux.app)

**What it is.** A real Linux (kernel 6.8.12, Buildroot user space) running in the visitor's browser tab through the v86 x86 emulator (BSD-2). 64 MB of RAM, no network (no `network_relay_url`), nothing touches the server. The Terminal app stays the "FunkyOS shell" (a pretend shell for this site); the new app is badged "REAL LINUX, runs in your browser", the start screen compares the two, and the Terminal banner and `help` say `linux` starts the real one.

**Files** (`public/linux/`, versioned names, `Cache-Control: public, max-age=31536000, immutable` through a new `/linux/:path*` rule in `next.config.ts`, the only config change):

| File | What | Raw size | gzip |
|---|---|---|---|
| `libv86-v1.js` | v86 0.5.473 (npm package `v86`, vendored; no new dependency) | 359,857 B | 93,320 B |
| `v1-v86.wasm` | the emulator core | 2,007,347 B | 379,720 B |
| `v1-v86-fallback.wasm` | only fetched on browsers that cannot run the main one | 2,040,034 B | 386,977 B |
| `seabios-v1.bin`, `vgabios-v1.bin` | SeaBIOS and VGA BIOS from `copy/v86` | 131,072 B + 36,352 B | 65,873 B + 15,951 B |
| `buildroot-v1.bin` | kernel and Buildroot root file system from i.copy.sh (`buildroot-bzimage68.bin`) | 10,068,480 B | 10,053,301 B |

A normal boot loads 12.6 MB raw (about 10.6 MB if the proxy compresses; the kernel image is already compressed inside). The progress bar counts the wasm, both BIOS files and the kernel (12.2 MB). `next start` serves these files uncompressed; a proxy may compress the script, the wasm and the BIOS files. Nothing loads until the visitor presses "Boot Linux"; a second boot reads everything from the browser cache (about 0.5 s). SHA-256 of the three downloaded binaries: kernel `507a759c…2eb1c`, SeaBIOS `73e3f359…4d98`, VGA BIOS `a4bc0d80…7880`. Licenses and source links (v86 BSD-2, SeaBIOS LGPLv3, Linux GPLv2, Buildroot user space) are in `docs/CREDITS.md`.

**Behaviour.**
- Start screen, then a real byte progress bar (our own `fetch` with a stream reader, passed to v86 as buffers), then the Linux boot log on the VGA text screen (canvas, VGA font). The shell is ready in about 10 s.
- Keyboard: v86's own keyboard is off. Keys typed on the screen go to Linux (text as US-layout scan codes, so Enter, arrows and Ctrl combinations work). The keys never reach FunkyOS (`/`, Esc and so on). Cmd shortcuts and Alt+Tab stay with FunkyOS. Control+Alt+Escape gives the keyboard back, so there is no keyboard trap.
- Phones: a "best on desktop" hint, an input box that types into Linux, and Tab, Esc, Ctrl-C, up and down buttons.
- Lifecycle: closing the window destroys the VM. Minimising pauses the CPU; after 30 s minimised the VM is destroyed and the window shows "Linux is off, Boot again". Reboot and Stop buttons are in the window.
- Entry points: `Linux.app` on the desktop, first in Files > Applications, pinned in the dock (width 900 px and up), the phone home screen, the palette, the commands `linux`, `boot linux` and `open linux`, and the share link `?app=linux` (it opens the start screen, it does not start the download).

**Tests (production build, `npx next start`, CSP unchanged: `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: ...`, no `'unsafe-eval'`).**
- 1280×800: nothing requested from `/linux/` before the button; real progress samples (0, 5.0 and 8.9 MB of 12.2 MB with the network limited to 4 MB/s); boot to a shell; `ls`, `uname -a` (`Linux (none) 6.8.12 ... i686 GNU/Linux`), `cat /proc/cpuinfo`, `echo`; `/` and Esc typed inside Linux do not open the palette or close the window; `rm -rf /` ran inside the VM only (FunkyOS stayed alive); Control+Alt+Escape; close and reopen; second boot from cache; minimised for 33 s and the VM was stopped.
- 390×844 touch: start screen with the hint, boot, typing through the input box, up arrow, back closes the sheet, no horizontal overflow.
- No Content-Security-Policy violations (a `securitypolicyviolation` listener found none) and no console errors in any run.
- Not tested: a real phone, Safari, Firefox (the v86 wasm needs a current browser; the fallback wasm exists for older ones), non-US keyboard layouts (characters are typed on a US layout, letters from other layouts are skipped), very slow networks beyond the 4 MB/s run.

### Spotify corner fix

The embed draws its own 12 px rounded corners, and the iframe's white background showed through them. The iframe now sits in a dark (#121212) stage with 8 px padding and a clip box (`border-radius: 12px; overflow: hidden`), and the iframe has `display: block`, `border-radius: 12px` and a dark background. Checked at 390 (phone sheet) and 1280, normal and maximised, teal and slate wallpaper: the pixels at the four corners of the iframe and in the frame around it are all #121212, and there is no gap above the footer note.
