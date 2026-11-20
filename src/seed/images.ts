import sharp from 'sharp'

/** Deterministic placeholder art (no network). Replace with real media in the CMS. */
const rand = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

const PALETTES = [
  ['#0f172a', '#f97316', '#fde68a'],
  ['#1e1b4b', '#a78bfa', '#f472b6'],
  ['#052e16', '#22c55e', '#d9f99d'],
  ['#0c4a6e', '#38bdf8', '#e0f2fe'],
  ['#3f0d12', '#ef4444', '#fecaca'],
  ['#1c1917', '#eab308', '#fef9c3'],
  ['#111827', '#14b8a6', '#ccfbf1'],
  ['#2e1065', '#f59e0b', '#fff7ed'],
]

export type Kind = 'photo' | 'project' | 'hardware' | 'game' | 'avatar'

export async function makeImage(kind: Kind, i: number, label: string, w = 1600, h = 1067) {
  const r = rand(i * 7919 + kind.length * 104729)
  const [bg, a, b] = PALETTES[i % PALETTES.length]
  let body = ''
  if (kind === 'photo') {
    // Sky gradient, sun, layered ridges: reads as a landscape at thumbnail size.
    const sunX = 200 + r() * (w - 400)
    const sunY = h * (0.25 + r() * 0.25)
    body += `<circle cx="${sunX}" cy="${sunY}" r="${60 + r() * 90}" fill="${b}" opacity="0.9"/>`
    for (let l = 0; l < 4; l++) {
      const base = h * (0.55 + l * 0.11)
      let d = `M0 ${h} L0 ${base}`
      for (let x = 0; x <= w; x += w / 12) d += ` L${x} ${base - r() * (140 - l * 25)}`
      d += ` L${w} ${h} Z`
      body += `<path d="${d}" fill="${bg}" opacity="${0.45 + l * 0.18}"/>`
    }
  } else if (kind === 'hardware') {
    for (let k = 0; k < 26; k++) {
      const x = r() * w, y = r() * h, x2 = x + (r() - 0.5) * 600
      body += `<path d="M${x} ${y} H${x2} V${y + (r() - 0.5) * 400}" stroke="${a}" stroke-width="6" fill="none" opacity="0.7"/>`
      body += `<circle cx="${x}" cy="${y}" r="12" fill="${b}"/>`
    }
    body += `<rect x="${w / 2 - 180}" y="${h / 2 - 120}" width="360" height="240" rx="18" fill="${bg}" stroke="${b}" stroke-width="6"/>`
  } else if (kind === 'avatar') {
    body += `<circle cx="${w / 2}" cy="${h * 0.42}" r="${w * 0.18}" fill="${b}"/><ellipse cx="${w / 2}" cy="${h * 1.02}" rx="${w * 0.36}" ry="${h * 0.38}" fill="${a}"/>`
  } else {
    // project / game: abstract UI blocks
    for (let k = 0; k < 9; k++) {
      body += `<rect x="${r() * w * 0.8}" y="${r() * h * 0.8}" width="${120 + r() * 420}" height="${60 + r() * 260}" rx="${r() * 40}" fill="${k % 2 ? a : b}" opacity="${0.25 + r() * 0.6}"/>`
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${a}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>${body}
    ${kind === 'avatar' ? '' : `<text x="48" y="${h - 48}" font-family="Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff" opacity="0.85">${label.replace(/[<&]/g, '')}</text>`}
  </svg>`
  const data = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer()
  const blur = await sharp(data).resize(16).webp({ quality: 40 }).toBuffer()
  return { data, blur: `data:image/webp;base64,${blur.toString('base64')}` }
}

/** Minimal valid one-page PDF so the resume link works before a real CV is uploaded. */
export function placeholderPdf(text: string) {
  const content = `BT /F1 24 Tf 72 720 Td (${text.replace(/[()\\]/g, '')}) Tj ET`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}
