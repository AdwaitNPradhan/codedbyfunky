/** GSAP core is loaded lazily after first paint (no plugins: scroll triggers use IntersectionObserver). */
type Loaded = { gsap: (typeof import('gsap'))['gsap'] }
let p: Promise<Loaded> | null = null

export function loadGsap(): Promise<Loaded> {
  p ??= import('gsap').then((g) => ({ gsap: g.gsap }))
  return p
}
