# /os — FunkyOS, a retro-modern desktop

Read `README.md` and `hiring-clarity.md` first. This brief only adds what is specific to `/os`.

## 1. Concept
You boot "FunkyOS 1.0" and land on a desktop where every portfolio section is an app: a README window, a Files explorer for projects, Photos, Games, a Lab, a Mail app and a real Terminal. Chunky bevels and pixel titles on the outside, modern springs and blur on the inside.
A recruiter should never be stuck: the About window opens by itself with `Resume`, `Email` and `GitHub` buttons, and a menu-bar `Hire me` button is always visible.

## 2. References (steal one thing each, copy nothing)
| URL | Steal |
|---|---|
| https://viram-choksi.vercel.app | ViramOS: boot sequence, login, snap zones, taskbar, command palette, 13+ apps. Write-up: https://dev.to/viramchoksi/why-my-portfolio-has-a-boot-sequence-window-manager-and-6-playable-games-15j9 (DOM windows over canvas: native text selection, forms, screen readers; React context for window state). |
| https://mitchivin.com | Obsessive detail: startup sound, dotted focus outlines, texture overlay. |
| https://joeyderuiter.me | Login screen, draggable folders, file system, an emulated app window. |
| https://matteosantoro.dev | Single-device metaphor (Game Boy) as the whole UI. |
| https://win95-portfolio-green.vercel.app | Each section as a draggable window with pixel fonts. |
| https://www.wearedevelopers.com/magazine/644/five-nostalgic-developer-portfolios-for-inspiration-644 | Roundup, note the failure mode: overdone metaphor hurts small screens. |

## 3. Tokens (`[data-variant="os"]`)
| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--desk-1` / `--desk-2` / `--desk-3` | `#16222E` / `#1F4E54` / `#2F6F6A` | wallpaper gradient `linear-gradient(160deg, 0%, 55%, 100%)` plus a dither tile | base |
| `--chrome` | `#ECE7DA` | window body, menu bar, dock plate | ink on chrome 13.9:1 |
| `--chrome-ink` | `#1B1B1F` | text on chrome | 13.9:1 |
| `--chrome-dim` | `#5B5648` | secondary text on chrome | 5.9:1 |
| `--title-on` | `#1F4E54` | active title bar bg | `#F6F1E4` text 8.2:1 |
| `--title-off` | `#C9C2B0` | inactive title bar bg | `--chrome-ink` text 9.7:1 (**not** `--chrome-dim`, 4.1:1) |
| `--accent` | `#FF6B35` | primary button fill, selection, `Hire me` | ink text on it 6.1:1; **never white (2.8:1)** |
| `--term-bg` / `--phosphor` / `--amber` | `#0B0F0C` / `#A8FF9E` / `#FFD166` | terminal bg / output / prompt | 16.1:1 / 13.4:1 |
| `--on-desk` | `#ECE7DA` | icon labels on wallpaper | 13.1:1 on `#16222E`, 7.5:1 on `#1F4E54` |
Bevel recipe: `box-shadow: inset 1px 1px 0 rgba(255,255,255,.7), inset -1px -1px 0 rgba(0,0,0,.2), 0 0 0 2px var(--chrome-ink), 6px 6px 0 rgba(0,0,0,.35)`. Window radius `6px`; buttons `4px`. One accent only.

**Type**
- UI: `Geist` 400, 500, 600 at 14px/1.4 (13px menu bar).
- Titles, boot logo, icon captions: `Pixelify Sans` 600 and 700 at 16px (window titles) and 48px (boot).
- Terminal and code: `JetBrains Mono` 400 and 500 at 14px/1.5.

## 4. Layout
- Desktop shell: menu bar `28px` (FunkyOS menu, active app name, `File` `View` `Go`, right: clock, sound toggle, `Resume` link, `Hire me` accent pill). Icon grid top-left in `96px` cells (48px icons, captions 2 lines max). Dock bottom-centre, `64px` tall plate, icons 48px.
- Icons: `README.txt` (About), `Projects` (folder), `Photos`, `Games`, `Lab` (hardware), `Skills`, `Terminal`, `Mail` (contact), `Resume.pdf`.
- Windows: default sizes About `640x440`, Files `760x480`, Photos `820x560`, Terminal `640x400`, Games `720x480`; opened with a `24px` cascade offset; bounded to the viewport below the menu bar.
- State: React context + `useReducer` (list of `{id, app, x, y, w, h, z, minimized, maximized, props}`), persisted in `sessionStorage`. Deep links `/os?app=terminal` and `/os?app=files&path=projects/<slug>`.
- SEO: server-render the CMS content as semantic `<main>` sections visually hidden with `clip` (not `display: none`) so crawlers and screen readers get everything. Offer `FunkyOS menu → Switch to plain page` (`/os?plain=1`) that renders the same content as a normal page.

## 5. Hero (the boot + the first window)
- H1 inside the auto-opened About window (idea): **"Hi, I'm {name}. I build software."** Sub: "Web apps, small games and electronics. I also take photos. This desktop is the portfolio: open an app, or type `help` in the terminal." Actions: `Resume` (accent), `Email`, `GitHub`, `Open projects`.
- Motion: desktop fades in `0.4s`, About window opens with spring (`scale .92 → 1`, `opacity 0 → 1`, `0.35s`, `cubic-bezier(.34,1.56,.64,1)`), icons stagger in `0.04s` each (`y 8 → 0`, `0.3s`, `power3.out`).

## 6. Apps (how each content section is shown)
| App | Content | Behaviour |
|---|---|---|
| About (`README.txt`) | Bio, availability, experience as an accordion timeline (`role, company, years, one line`) | Opens on boot. Buttons: Resume, Email, GitHub, LinkedIn, Instagram. |
| Files (Projects) | Sidebar tree: `Projects`, `Photos`, `Games`, `Hardware`, `Documents`. List and icon view toggle; columns `Name`, `Kind`, `Year`, `Stack`. | Single-click selects, double-click opens a **Preview** window (cover, summary, problem/role/outcome, links, chips). `Space` = Quick Look. Breadcrumbs, filter box, arrow-key navigation. |
| Photos | Albums from CMS categories, thumbnail grid, viewer with slideshow (`3s`, pause on hover), `i` info panel (EXIF 3 cells), zoom (wheel/pinch). | Toolbar has a prominent **`Open Instagram @handle`** button; window title `Photos, @handle`. Instagram also in the menu bar and the desktop as `Instagram.url`. |
| Games | Library list with covers; selecting runs the game inline (iframe or canvas) in the window. | Ships with one built-in canvas game (Snake, ≤ 150 lines) so the app works offline; CMS games are links/iframes. Pauses when window loses focus. |
| Lab (Hardware) | Project cards with spec tabs (`Overview`, `Specs`, `Build log`), status chip (`shipped`, `prototype`, `planned`), photos. | Planned = dashed border + `not yet built`. |
| Skills | "Activity Monitor": rows `Name`, `Kind`, `Used for`, `Level` (`daily`, `often`, `learning`). | No fake percentages. Sortable columns. |
| Mail (Contact) | Compose window: To (fixed), Subject, Body, Reply-to email. | `Send` posts to the shared contact endpoint; success plays a window "swoosh" (`y 0 → -40`, `opacity 1 → 0`, `0.4s`, `power3.in`) and shows a sent confirmation. Also shows copy-email button. |
| Resume.pdf | PDF viewer (`<object>` with fallback link). | Toolbar `Download`. Same file as the menu-bar `Resume`. |
| Settings | Wallpaper (3), accent (4), reduce motion, sound, plain page. | Persists in `localStorage`. |

## 7. Terminal (real commands)
Registry: `Record<string, { desc, usage, run(args, ctx) => ReactNode | Promise<ReactNode> }>`; parser supports quotes; `Tab` completes commands, project slugs and file names; `↑/↓` history (50 entries); `Ctrl+L` clears; `Ctrl+C` cancels. Output links are real `<a>`.
| Command | Result |
|---|---|
| `help` | List with one-line descriptions. |
| `about`, `whoami`, `neofetch` | Bio text; `neofetch` prints stack info from real values (framework, CMS, fonts), no invented numbers. |
| `projects [--stack x] [n]` | List or detail; each item clickable. |
| `open <slug>` / `cat <file>` | Opens Preview window / prints markdown summary. |
| `ls`, `cd`, `pwd` | Virtual FS built from CMS: `/about.txt`, `/projects/<slug>.md`, `/photos/…`, `/games/…`, `/hardware/…`, `/resume.pdf`. |
| `photos`, `instagram` | Opens Photos / the Instagram profile (new tab). |
| `games`, `play <name>` | Lists / launches in the Games app. |
| `hardware`, `skills`, `exp` | Lists with status/level. |
| `contact`, `email`, `github`, `linkedin` | Opens Mail / `mailto:` / external links. |
| `resume` | Starts the PDF download and prints the file name. |
| `theme <name>`, `sound on/off`, `clear`, `history`, `date`, `echo` | Utilities. |
| `sudo hire funky` | Easter egg: prints `permission granted`, opens Mail with a pre-filled subject `Let's talk`, pixel confetti `1.2s`. |
Unknown command → `command not found: x. Try 'help'.`

## 8. Signature interactions
1. **Boot sequence** (section 9).
2. **Window springs:** open `scale .92 → 1` `0.35s` `cubic-bezier(.34,1.56,.64,1)`; close `scale 1 → .96`, `opacity → 0`, `0.18s`, `power2.in`; focus raises z and brightens title (`0.12s`).
3. **Minimise/restore:** window scales to `0.2` and translates to its dock icon (`0.35s`, `cubic-bezier(.7,0,.84,0)`); restore `0.4s`, `expo.out`.
4. **Dock magnification:** `scale = 1 + 0.5 * cos(clamp(dist / 120, 0, 1) * π/2)`, spring `stiffness 320, damping 24, mass 0.7`; tooltip label after `150ms`. Running apps get a 4px dot.
5. **Snap zones:** dragging within `16px` of the left/right edge shows a translucent half-screen preview (`120ms` fade) and snaps on drop; top edge maximises; dragging a snapped window out restores its old size.
6. **Command palette:** `Cmd/Ctrl+K` (or `/`) opens a fuzzy search over apps, projects, photos, commands (`120ms`, `scale .98 → 1` + fade). Enter opens; `Esc` closes.
7. **Desktop icons:** drag with `96px` grid snap, rubber-band selection, right-click menu (`Change wallpaper`, `About FunkyOS`, `Open Terminal`). Keyboard: arrows move selection, `Enter` opens.
8. **Shutdown easter egg:** `FunkyOS menu → Shut down` runs a CRT-off (`scaleY 1 → .005` `0.2s`, then `scaleX → 0` `0.2s`, `power4.in`), black for `0.6s`, then reboots.
9. **Wallpaper parallax:** dither layer moves `±6px` with pointer, damped `0.05` (desktop only).
Window drag uses `motion` `drag` with `dragControls`, `dragMomentum: false`, constraints to viewport (below the menu bar). Resize uses 8 pointer-event handles (min `320x220`), batched in `requestAnimationFrame`. Direct-manipulation resize is the one exception to "do not animate width/height".

## 9. Boot sequence (first visit ≤ 3.2s; any key/click fast-forwards)
1. `0 to 1.1s` black. Mono lines in `--phosphor` appear every `90 to 140ms`: `FunkyOS BIOS v1.0`, `checking memory… ok`, `mounting portfolio.db… ok`, `loading next, react, payload… ok`, `starting window manager… ok`. Only real stack names; no fake benchmark numbers.
2. `1.1 to 2.5s` centred `FunkyOS` in Pixelify Sans 48px with a 12-segment progress bar (`steps(12)`, `0.9s`).
3. `2.5 to 3.2s` cross-fade to desktop (`0.4s`, `power2.inOut`); optional startup chime if sound is on; About window opens.
4. Returning visitor (`sessionStorage.funkyBooted`) → quick boot `0.6s`. SSR content exists under the black layer so LCP is not blocked.

## 10. Cursor
Desktop: CSS cursor `url(/cursors/arrow.svg) 2 2, auto` (16x16 pixel arrow with chrome fill and ink outline), a pixel hourglass while an app opens (`0.3s`), pixel I-beam in text areas and terminal. Never hide the system cursor on mobile or when `pointer: coarse`.

## 11. Sound (optional, OFF by default)
Menu-bar toggle and Settings. When on (after a user gesture): boot chime (triangle `C5 → G5`, `180ms` each, gain `0.06`), 20ms click on window actions (gain `0.03`), error blip on unknown terminal command. No autoplay.

## 12. Mobile (under 768px or `pointer: coarse`): "FunkyOS Touch"
- No floating windows. Home screen = 4-column icon grid with wallpaper; dock becomes a 4-tab bottom bar (`About`, `Projects`, `Photos`, `Terminal`).
- Apps open full screen as sheets (`y 100% → 0`, `0.35s`, `expo.out`); close with the top-left `Back` or by dragging down (`drag="y"`, close if `offset.y > 120 || velocity.y > 500`).
- Terminal shows quick-command chips (`help`, `projects`, `contact`, `resume`) above the keyboard; font 15px.
- Menu bar shrinks to clock + `Hire me`. Boot sequence runs `1.4s` max.

## 13. `prefers-reduced-motion: reduce`
Boot becomes a `0.3s` fade. Window open/close/minimise = `120ms` opacity only. No dock magnification (fixed 48px), no wallpaper parallax, no icon stagger. Snap preview shows instantly. CRT shutdown = fade. Terminal cursor is solid, no blink; confetti off. Settings toggle `Reduce motion` also forces this mode.

## 14. Performance budget
| Item | Limit |
|---|---|
| Rendering | DOM windows (max ~6 open); no WebGL, no canvas except the Snake game |
| Code splitting | Shell + About only in the first chunk; Terminal, Files, Photos, Games, Lab, Mail, Settings via `next/dynamic` on first open |
| JS (initial) | ≤ 170 KB gz; `motion` `LazyMotion` with `domMax` (drag) |
| Blur | `backdrop-filter` only on menu bar and dock (2 surfaces), never on windows |
| Window body | `contain: layout paint`; drag animates `transform` only (motion values, no React re-render) |
| Images | Photos thumbs 320w AVIF, viewer 1600w loaded on open; icons are inline SVG sprite |
| Game loops | Paused when window unfocused/minimised or tab hidden |
| Web vitals | LCP ≤ 2.0s (About text), CLS 0 (windows are absolutely positioned), INP ≤ 200 ms |

## 15. Builder checklist
- [ ] Window chrome buttons are real `<button>`s with labels (`Close`, `Minimise`, `Maximise`); windows are `role="dialog"` with `aria-labelledby`; focus moves into a new window and returns to its dock icon on close.
- [ ] Every app reachable by keyboard: `Tab` order menu bar → icons → dock → windows; `Alt+Tab` cycles windows.
- [ ] Terminal output is an `aria-live="polite"` log; links are focusable.
- [ ] CMS drives all data (projects, photos, games, hardware, skills, experience, profile). No fake stats anywhere, including the boot log and `neofetch`.
- [ ] `/os?plain=1` and the hidden semantic content cover SEO and a11y.
