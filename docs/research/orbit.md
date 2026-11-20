# /orbit — Three.js scroll walkthrough

Read `README.md` and `hiring-clarity.md` first. This brief only adds what is specific to `/orbit`.

## 1. Concept
You fly a camera along one continuous spline through 7 "stations". Each station is a small set piece for one content area, built from cheap geometry (instanced primitives, line work, a few shaders), not a big GLB scene.
All text is real HTML laid over a fixed canvas, so SEO, copy/paste and screen readers work. The canvas is decoration plus wayfinding.

## 2. References (steal one thing each, copy nothing)
| URL | Steal |
|---|---|
| https://bruno-simon.com | World you move through; physics toys; Awwwards Portfolio Honors + Site of the Month (Jan 2026). Steal: every object is a link, hover = object reacts. |
| https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/ | Scroll maps to camera + object + reveal timing; GSAP Observer to unify wheel/touch/trackpad; KTX2, instancing, low-res atmospheric pass on mobile, culling by known camera path. |
| https://tympanus.net/codrops/2026/06/11/sketching-the-impossible-a-3d-portfolio-built-without-a-single-3d-model/ | R3F + GSAP camera flights; flat planes with hand-drawn textures; hover "paint reveal" shader tells you what is clickable. |
| https://www.igloo.inc | Infinite-feeling 3D scroll, restrained palette, one hero object. |
| https://lusion.co | Lighting, post-processing taste, tactile hover on 3D objects. |
| https://activetheory.net | Station-to-station transitions, intro choreography, UI chrome over WebGL. |

## 3. Tokens (declare once at `:root` inside `[data-variant="orbit"]`)
| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--void` | `#0A0B12` | page + canvas clear colour | base |
| `--deep` | `#11131E` | panels, HUD cards | base |
| `--bone` | `#ECE8DF` | primary text | 16.1:1 on void |
| `--mist` | `#A7A9B8` | secondary text | 8.4:1 on void, 7.9:1 on deep |
| `--faint` | `#7C7F92` | captions, 14px+ only | 5.0:1 on void, 4.7:1 on deep |
| `--solar` | `#FF7A3D` | the one UI accent, links, CTA fill | 7.6:1 on void; ink `#0A0B12` on solar 7.6:1 |
| `--ice` | `#8FB8FF` | secondary accent, 3D line work, focus ring | 9.8:1 on void |
| `--line` | `rgba(236,232,223,.12)` | hairlines | decorative |
Station light tints (3D fog and rim light only, never UI text): intro `#FF7A3D`, projects `#FFB347`, photography `#ECE8DF`, games `#7CFFB2`, hardware `#5FD0C5`, skills `#8FB8FF`, contact `#FF7A3D`. Black text on `#FFB347` is 11.0:1 if a station needs a filled chip.
No purple-to-blue gradients. Fog is `void` to a 6% tint of the station colour.

**Type** (next/font/google, loaded only in this variant's layout)
- Display: `Funnel Display` 700 and 800. Station titles `clamp(3rem, 9vw, 9rem)`, tracking `-0.03em`, leading `0.92`.
- Body: `Geist` 400 and 500, 18px/1.55 (16px on mobile).
- HUD and data: `Geist Mono` 400, 12 to 13px, uppercase allowed, tracking `0.06em`.

## 4. Architecture and layout
- Fixed `<Canvas>` behind everything (`position: fixed; inset: 0; z-index: 0`), loaded with `next/dynamic({ ssr:false })` after first paint.
- Page is normal DOM scroll, height `700vh` (100vh per station). **Do not use drei `ScrollControls`**: it traps scroll in its own div and hides DOM text from crawlers.
- Lenis drives smooth scroll. ScrollTrigger (`scrub: 1.2`) writes `progress` (0..1) into a plain mutable ref. `useFrame` reads the ref. Never `setState` per scroll tick.
- Camera path: `CatmullRomCurve3` of 14 to 18 control points (2 per station: approach + dwell), `tension 0.5`, closed `false`. Position = `curve.getPointAt(t)`. Look target = `curve.getPointAt(min(t + 0.012, 1))`, lerped `0.08`/frame.
- Dwell mapping: each station gets 100vh of scroll = 60% travel, 40% dwell. Remap raw progress with `smoothstep` plateaus so the camera moves at about 15% speed during dwell.
- Mouse parallax: camera rotation offset max 0.12 rad, damped `0.06`/frame. Touch: off.
- Overlay panels: `position: sticky; top: 0; height: 100vh` per station; content sits in a 12-col grid, copy in cols 1 to 5 (or 8 to 12 on alternating stations). Max content width 1360px, side gutters 32px (16px mobile).
- Persistent HUD (HTML, z-index 20): top-left wordmark `funky`, top-right `Work` `Resume` `Contact` (Resume = file download), right-edge rail with 7 ticks and labels, bottom-left `03/07 Photography` counter and a `Plain view` toggle (collapses to a normal stacked page, same content).

## 5. Hero (station 1, "Dock")
- 3D: a slow-rotating wireframe sun (icosahedron detail 3, `--solar` lines, 0.4 opacity) and two thin torus rings; 1200 instanced star points. Camera starts 40 units back.
- H1 (7 words or fewer, from CMS `profile.headline`; idea): **"Software, photographs and gadgets."** Sub (one sentence): "I'm {name}, a software engineer who also shoots photos, ships web games and builds hardware." Actions: `See the work` (scrolls to station 2) and `Resume` (download). Below fold on 1280x800 must still show: H1, sub, both buttons.
- Motion: SplitText `chars` rise `yPercent 110 → 0`, `duration 0.9`, `stagger 0.03`, ease `expo.out`, after the dolly-in finishes. Sub and buttons fade up `y 16`, `0.6s`, `power3.out`, delay 0.5.
- About lives here as a second panel at 30% of station 1 scroll: 60-word bio, portrait in a circular mask with a `--solar` ring.

## 6. Sections as stations
| # | Station | 3D set piece | DOM overlay |
|---|---|---|---|
| 1 | Intro + About | sun, rings, stars (above) | H1, bio panel, social links |
| 2 | Projects | "Monolith field": 6 to 8 tall instanced slabs in two rows, each a plane with the project cover texture (WebP 1024w). Camera weaves between rows. | Active project card (title, one-line outcome, stack chips, `Case study` + `Live` links) swaps as the nearest slab changes. Click slab or card opens `/orbit/projects/[slug]`. |
| 3 | Photography | "Aperture": 12 framed photo planes arranged on a helix; camera flies through the iris. | Caption (title, place, EXIF in 3 mono cells). **Instagram CTA**: solid `--solar` pill `Follow @{profile.instagram}` always visible in this station, plus a copy in the contact station. |
| 4 | Games | "Cabinet row": 4 to 6 low-poly cabinets (boxes + emissive screen plane with a GIF/video texture, paused offscreen). | Game card with `Play` (new tab or inline route). |
| 5 | Hardware | "Circuit moon": a flat PCB disc, trace lines drawn with a `drawRange`/dash shader, boxes for chips, animated pulse every 3s. | Project list with status chip (`shipped`, `prototype`, `planned`), spec rows. Planned items render as dashed lines. |
| 6 | Skills + Experience | "Constellation": nodes per skill (instanced spheres) joined by thin lines; a horizontal rail underneath carries the experience timeline. | Skill groups as plain text lists (hover a group = highlight its nodes); timeline rows `role, company, years, one line`. |
| 7 | Contact | "Beacon": camera slows to a stop in front of a warm lit window. | Form (name, email, message) + `mailto` + copy-email button + Resume + GitHub + LinkedIn + Instagram. |

## 7. Signature interactions
1. **Station arrival:** when a station's dwell begins, its title does a SplitText line reveal (`yPercent 100 → 0`, `0.8s`, `stagger 0.08`, `expo.out`), the rail tick scales `1 → 1.6` (`0.3s`, `back.out(2)`), fog tint tweens `1.2s` `power2.inOut`.
2. **Object hover (raycast, throttled to 30 Hz):** object scales `1 → 1.06` and lifts `0.15` units over `0.35s` `power3.out`; cursor label appears (`OPEN`, `PLAY`, `VIEW`).
3. **Rail jump:** click a tick → `lenis.scrollTo(stationTop, { duration: 2.2, easing: t => t < .5 ? 8*t**4 : 1 - 8*(1-t)**4 })` (power4.inOut). Camera flies through intermediate stations, not a cut.
4. **Velocity streaks:** star points stretch along the view axis by `clamp(|scrollVelocity| * 0.0009, 0, 0.6)`. Decays with `damp 0.12`.
5. **Photo helix scrub:** helix rotates `-2π * stationProgress`; the photo nearest the camera scales `1.12` and its neighbours dim to 0.55 opacity.
6. **Magnetic CTA buttons:** pointer within 80px pulls the button `max 10px` via `quickTo` (`duration 0.4`, `ease power3.out`); returns with `elastic.out(1, .5)` over `0.8s`.
7. **Contact success:** on submit OK, the beacon pulses (scale `1 → 1.4 → 1`, `0.9s`, `sine.inOut`) and the form is replaced by a confirmation line.
Post-processing (desktop only): `Bloom` (`luminanceThreshold 0.9`, `intensity 0.6`, `mipmapBlur`), `Noise` (`opacity 0.04`), `Vignette` (`offset 0.3`, `darkness 0.6`). No chromatic aberration, no glitch.

## 8. Page-load sequence (total ≤ 2.4s on warm cache; skippable)
1. `0 to 0.3s`: solid `--void`; SSR HTML (H1, sub, buttons) is already in the DOM beneath a veil, so LCP is text.
2. `0.3 to 1.4s`: centred `funky` wordmark + thin progress ring (drei `useProgress`, min display 1.0s).
3. `1.4 to 2.4s`: veil `opacity 1 → 0` (`0.8s`, `power2.inOut`) while camera dollies from z=40 to start (`2.2s`, `power4.inOut`), then hero text reveals.
4. `Skip` link visible from 0.3s. If `sessionStorage.orbitSeen` exists, run steps 1 to 3 at 0.6s total.

## 9. Cursor
Desktop only. 12px ring (`border 1px --bone`, `mix-blend-mode: difference`) following the pointer at `lerp 0.18`. Over raycast-hit objects or links it grows to 56px with a Geist Mono label inside. Over text and inputs it becomes a 2px caret bar. Keep the native cursor over form fields. Hide on `pointer: coarse`.

## 10. Sound (optional, OFF by default)
Bottom-left `Sound off` toggle (persist in `localStorage`). On enable (after the user click): WebAudio sine drone 55 Hz, gain 0.03, low-pass cutoff `220 + |scrollVelocity|*0.6` Hz; 880 Hz blip, `80ms`, gain 0.05 on station arrival. Never autoplay. Mute on `visibilitychange: hidden`.

## 11. Mobile (under 768px)
- DPR fixed at 1, no post-processing, instance counts halved, star count 400, no raycast hover (tap a card to focus its object).
- Canvas stays fixed; overlay panels become a bottom sheet (max 46vh, `--deep` at 92% opacity, blur 12px only on this one surface). Rail becomes a horizontal 7-dot bar above the sheet.
- Scroll length `560vh`. Use native touch scroll + Lenis `syncTouch: false`.
- Photo helix becomes a vertical row of 6 planes. Skills become a chip list (no constellation lines).

## 12. `prefers-reduced-motion: reduce`
- No camera flight, no dolly intro, no velocity streaks, no magnetic buttons, no post-processing. Render one static frame per station as a still (`<Canvas frameloop="never">` with one manual `invalidate`) behind a normal stacked page; stations become ordinary sections.
- Transitions shrink to `opacity` 150ms. Rail jump uses `scrollIntoView({ behavior: 'auto' })`. Sound toggle stays available.
- `Plain view` is the default when this media query matches.

## 13. Performance budget
| Item | Limit |
|---|---|
| DPR | `[1, 1.5]`; allow 2 only on desktop while `PerformanceMonitor` reports ≥ 58 fps; drop one step when < 45 fps for 1s |
| Draw calls | ≤ 150 desktop, ≤ 80 mobile (`renderer.info.render.calls`) |
| Triangles | ≤ 400k desktop, ≤ 150k mobile |
| Textures | WebP/KTX2, ≤ 1024px, ≤ 24 live textures; dispose on leave |
| 3D payload | ≤ 1.5 MB before first interaction; remaining stations lazy-load when the previous is 60% done |
| Geometry | `InstancedMesh` for slabs, stars, nodes; Draco for any GLB; no GLB > 300 KB |
| Render loop | `frameloop="demand"` when the tab is hidden or the canvas is off-screen; no per-frame allocations (reuse `Vector3`) |
| JS (route) | ≤ 260 KB gz excluding `three` chunk; `three`/r3f/drei in a separate lazy chunk |
| Web vitals | LCP ≤ 2.0s (text), CLS 0, INP ≤ 200 ms |
Fallbacks: no WebGL2, `saveData`, `deviceMemory ≤ 2`, or battery saver → `Plain view` with a CSS gradient poster.

## 14. Builder checklist
- [ ] Content only from CMS; confirm collection names in `src/collections` before wiring.
- [ ] Every 3D object that opens something has a DOM twin (a real link) in the overlay.
- [ ] `Resume`, `Contact`, `Instagram` reachable in one click from any station.
- [ ] Back button works; each station has a hash (`#projects`) kept in sync on arrival.
- [ ] Case-study pages `/orbit/projects/[slug]` are plain, fast, no WebGL.
- [ ] `dispose()` geometries, materials, textures on unmount.
