import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

// Registered once for the whole variant. Flip is registered by the lightbox chunk only.
if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin)

export { gsap, ScrollTrigger, SplitText }
