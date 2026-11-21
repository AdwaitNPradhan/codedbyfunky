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
