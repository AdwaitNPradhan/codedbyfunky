/** Canvas confetti: 80 particles, ~1.2s, one fullscreen canvas created on demand and removed after. */
const TOKENS = ['--pink', '--yellow', '--blue', '--mint', '--orange', '--lilac']

export function fireConfetti(root: HTMLElement, origin?: { x: number; y: number }) {
  if (typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches)
    return
  const dpr = Math.min(Math.max(devicePixelRatio || 1, 1), 1.75)
  const canvas = document.createElement('canvas')
  canvas.className = 'ar-confetti'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  root.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }
  const cs = getComputedStyle(root)
  const colors = TOKENS.map((t) => cs.getPropertyValue(t).trim() || '#FFD500')
  const ox = (origin?.x ?? innerWidth / 2) * dpr
  const oy = (origin?.y ?? innerHeight * 0.6) * dpr
  const parts = Array.from({ length: 80 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
    const v = (500 + Math.random() * 900) * dpr
    return {
      x: ox,
      y: oy,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      w: (6 + Math.random() * 8) * dpr,
      h: (4 + Math.random() * 6) * dpr,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 18,
      c: colors[i % colors.length],
    }
  })
  const start = performance.now()
  let last = start
  const loop = (t: number) => {
    const dt = Math.min((t - last) / 1000, 1 / 30)
    last = t
    const k = (t - start) / 1200
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1
    for (const p of parts) {
      p.vy += 1700 * dpr * dt
      p.vx *= 0.985
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.r += p.vr * dt
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.fillStyle = p.c
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.lineWidth = 1.5 * dpr
      ctx.strokeStyle = cs.getPropertyValue('--ink').trim() || '#111'
      ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (k < 1) requestAnimationFrame(loop)
    else canvas.remove()
  }
  requestAnimationFrame(loop)
}
