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
