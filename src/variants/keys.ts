export const VARIANT_KEYS = ['orbit', 'darkroom', 'blueprint', 'arcade', 'os'] as const
export type VariantKey = (typeof VARIANT_KEYS)[number]

export const VARIANT_META: Record<VariantKey, { title: string; blurb: string }> = {
  orbit: { title: 'Orbit', blurb: '3D scroll walkthrough through a world of work.' },
  darkroom: { title: 'Darkroom', blurb: 'Photography-led editorial, film grain and contact sheets.' },
  blueprint: { title: 'Blueprint', blurb: 'Engineering drawings, PCB traces and exploded views.' },
  arcade: { title: 'Arcade', blurb: 'Loud, playful, neo-brutalist. Games everywhere.' },
  os: { title: 'FunkyOS', blurb: 'A desktop in the browser. Windows, dock, terminal.' },
}

export const isVariantKey = (k: string): k is VariantKey =>
  (VARIANT_KEYS as readonly string[]).includes(k)
