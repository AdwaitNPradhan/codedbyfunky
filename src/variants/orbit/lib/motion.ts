/**
 * GSAP, its plugins and Lenis load after first paint (dynamic import), so the server-rendered
 * text is never waiting on them. One registration, memoised.
 */
async function load() {
  const [{ gsap }, { ScrollTrigger }, { SplitText }, { default: Lenis }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('gsap/SplitText'),
    import('lenis'),
  ])
  gsap.registerPlugin(ScrollTrigger, SplitText)
  return { gsap, ScrollTrigger, SplitText, Lenis }
}

export type Motion = Awaited<ReturnType<typeof load>>
let cache: Promise<Motion> | null = null
export const loadMotion = () => (cache ??= load())
