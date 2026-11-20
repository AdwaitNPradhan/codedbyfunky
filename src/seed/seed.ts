import type { CollectionSlug, Payload } from 'payload'
import { makeImage, placeholderPdf, type Kind } from './images'
import { GAME_LABELS, type GameKey } from '../games/keys'

/** DEMO content. Replace through the CMS after the interview session. */
export const CONTENT: CollectionSlug[] = ['projects', 'photos', 'games', 'hardware', 'skills', 'experience', 'messages', 'media']

async function upload(payload: Payload, kind: Kind, i: number, label: string, alt: string) {
  const { data, blur } = await makeImage(kind, i, label, kind === 'avatar' ? 800 : 1600, kind === 'avatar' ? 800 : 1067)
  const doc = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt, blurDataURL: blur },
    file: { data, mimetype: 'image/jpeg', name: `${kind}-${i}.jpg`, size: data.length },
  })
  return doc.id
}

export async function wipe(payload: Payload, { includeTestUsers = false } = {}) {
  for (const collection of CONTENT) {
    await payload.delete({ collection, where: { id: { exists: true } }, overrideAccess: true })
  }
  if (includeTestUsers) {
    await payload.delete({ collection: 'users', where: { email: { contains: '.test' } }, overrideAccess: true })
  }
}

export async function seed(payload: Payload, log = (m: string) => payload.logger.info(m)) {
  log('seed: generating media')
  const avatar = await upload(payload, 'avatar', 3, '', 'Portrait placeholder')
  const resumePdf = placeholderPdf('Resume placeholder - replace in CMS')
  const resume = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: 'Resume (PDF)' },
    file: { data: resumePdf, mimetype: 'application/pdf', name: 'resume.pdf', size: resumePdf.length },
  })

  await payload.updateGlobal({
    slug: 'site',
    overrideAccess: true,
    data: {
      name: 'Adwait Pradhan',
      handle: 'funky',
      tagline: 'I build fast, playful software — and photograph the world between commits.',
      roles: ['Full-stack engineer', 'Creative developer', 'Photographer', 'Hardware tinkerer'],
      shortBio:
        'Full-stack engineer who ships product end to end: React and Next.js on the front, Node and Go on the back, and the odd ESP32 on the bench. I care about speed, craft and interfaces that feel alive.',
      longBio:
        'I started by breaking my family PC and have not stopped taking things apart since. Today I design and build web products, from first sketch to production on my own servers. Off the keyboard I shoot street and landscape photography, solder small gadgets, and make tiny browser games for fun.\n\nI like small teams, sharp problems and owning outcomes.',
      location: 'India',
      timezone: 'IST · UTC+5:30',
      avatar,
      resume: resume.id,
      availability: { status: 'open', note: 'Open to full-time roles and select freelance work.' },
      stats: [
        { value: '6+', label: 'years shipping' },
        { value: '40+', label: 'projects built' },
        { value: '8', label: 'browser games' },
        { value: '12k', label: 'photo followers' },
      ],
      publicEmail: 'hello@codedbyfunky.com',
      socials: [
        { platform: 'github', label: 'GitHub', url: 'https://github.com/AdwaitNPradhan' },
        { platform: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/your-handle' },
        { platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/your-handle' },
        { platform: 'x', label: 'X', url: 'https://x.com/your-handle' },
      ],
      instagram: {
        handle: '@codedbyfunky',
        url: 'https://www.instagram.com/your-handle',
        followers: '12.4k',
        pitch: 'Street, monsoon and night photography. New frames every week — follow along.',
      },
      seoTitle: 'Adwait Pradhan (funky) — engineer, photographer, tinkerer',
      seoDescription: 'Portfolio of Adwait Pradhan: full-stack engineering, creative web, browser games, hardware builds and photography.',
    },
  })

  log('seed: projects')
  const projects = [
    ['Pulseboard', 'Real-time ops dashboard that streams 50k events/min to a calm, readable UI.', ['Next.js', 'Go', 'ClickHouse', 'WebSockets'], 'Lead engineer', 2026, '#7c5cff'],
    ['ReelForge', 'Pipeline that turns long videos into captioned short reels automatically.', ['Node', 'FFmpeg', 'Redis', 'Whisper'], 'Creator', 2025, '#ff4d2e'],
    ['Finzips', 'Personal finance app with zero-friction expense capture and monthly insights.', ['React Native', 'Postgres', 'tRPC'], 'Full-stack', 2025, '#22c55e'],
    ['Lumiere', 'Photographer portfolio builder with AI-assisted culling and fast galleries.', ['Next.js', 'Sharp', 'S3'], 'Founder', 2024, '#f59e0b'],
    ['Huddle', 'Low-latency voice rooms for small teams, built on WebRTC SFU.', ['WebRTC', 'Rust', 'React'], 'Backend', 2024, '#38bdf8'],
    ['Desk Dachi', 'A tiny desktop pet that reacts to your focus sessions.', ['Electron', 'Canvas', 'SQLite'], 'Solo', 2023, '#f472b6'],
  ] as const
  for (const [i, [title, summary, stack, role, year, accent]] of projects.entries()) {
    const cover = await upload(payload, 'project', i, title, `${title} interface`)
    const g1 = await upload(payload, 'project', i + 20, `${title} · detail`, `${title} detail view`)
    await payload.create({
      collection: 'projects',
      overrideAccess: true,
      data: {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        summary,
        role,
        client: i % 2 ? 'Personal' : 'Client work',
        year,
        stack: [...stack],
        tags: i < 3 ? ['product', 'web'] : ['experiment'],
        cover,
        gallery: [g1],
        problem: 'Teams were drowning in noisy data and slow tools. The brief: make the important thing obvious in under a second.',
        approach: 'Prototyped three interaction models in a week, tested with five users, then built the winner with a streaming backend and an optimistic UI.',
        outcome: 'Shipped in 8 weeks. Load time dropped from 4.2s to 0.6s and daily active use doubled.',
        metrics: [
          { value: '0.6s', label: 'time to interactive' },
          { value: '2×', label: 'daily active users' },
          { value: '8 wk', label: 'idea to launch' },
        ],
        links: { live: 'https://example.com', repo: 'https://github.com/AdwaitNPradhan' },
        accent,
        featured: i < 3,
        order: i,
        published: true,
      },
    })
  }

  log('seed: photos')
  const photos = [
    ['Monsoon Alley', 'Mumbai', 'Monsoon'], ['Blue Hour Ghats', 'Varanasi', 'Rivers'], ['Salt Flats', 'Rann of Kutch', 'Open land'],
    ['Neon Chai', 'Bengaluru', 'Night'], ['Fog Line', 'Munnar', 'Hills'], ['Tram 24', 'Kolkata', 'Streets'],
    ['Desert Lights', 'Jaisalmer', 'Open land'], ['Harbour 5am', 'Kochi', 'Rivers'], ['Ridge Walk', 'Spiti', 'Hills'],
    ['Signal', 'Pune', 'Night'], ['Umbrella Sea', 'Mumbai', 'Monsoon'], ['Last Ferry', 'Goa', 'Rivers'],
  ] as const
  for (const [i, [title, location, series]] of photos.entries()) {
    const image = await upload(payload, 'photo', i, '', `${title}, ${location}`)
    await payload.create({
      collection: 'photos',
      overrideAccess: true,
      data: {
        title,
        image,
        location,
        series,
        takenAt: new Date(2025, i % 12, 3 + i).toISOString(),
        camera: i % 2 ? 'Fujifilm X-T5' : 'Sony A7 IV',
        lens: i % 3 ? '35mm f/1.4' : '85mm f/1.8',
        exposure: ['f/1.8 · 1/250 · ISO 200', 'f/4 · 1/60 · ISO 800', 'f/8 · 1/500 · ISO 100'][i % 3],
        instagramUrl: 'https://www.instagram.com/your-handle',
        featured: i < 6,
        order: i,
        published: true,
      },
    })
  }

  log('seed: games')
  const games: [GameKey, string, string, string][] = [
    ['bug-squash', 'Bugs crawl across the editor. Squash them before they ship.', 'Click / tap the bugs', '#c6ff3d'],
    ['commit-snake', 'Eat commits, grow your branch, avoid merge conflicts.', 'Arrows / WASD · swipe', '#22c55e'],
    ['deploy-dash', 'Run the pipeline. Jump failing builds, duck flaky tests.', 'Space / tap to jump', '#38bdf8'],
    ['shutter-snap', 'Nail focus and timing. Snap when the subject hits the thirds.', 'Click / tap to shoot', '#f59e0b'],
    ['circuit-flow', 'Rotate traces to route power from battery to LED.', 'Click / tap tiles to rotate', '#14b8a6'],
    ['hotfix-typer', 'Type the falling tokens before they reach prod.', 'Keyboard', '#ef4444'],
    ['orbit-sling', 'Sling a probe through gravity wells to reach the beacon.', 'Drag to aim, release to launch', '#a78bfa'],
    ['server-stack', 'Drop servers into the rack. Overhang gets trimmed.', 'Click / tap / space', '#f472b6'],
  ]
  for (const [i, [component, description, controls, accent]] of games.entries()) {
    const cover = await upload(payload, 'game', i + 40, GAME_LABELS[component], `${GAME_LABELS[component]} cover`)
    await payload.create({
      collection: 'games',
      overrideAccess: true,
      data: {
        title: GAME_LABELS[component],
        slug: component,
        component,
        tagline: description.split('.')[0],
        description,
        controls,
        cover,
        accent,
        featured: i < 4,
        order: i,
        published: true,
      },
    })
  }

  log('seed: hardware')
  const hw = [
    ['Weather Totem', 'built', 'Solar ESP32 weather station that posts to a home dashboard every 5 minutes.', ['ESP32', 'BME280', 'TP4056', '6V solar panel'], ['KiCad', 'Fusion 360', 'PlatformIO'], 2025],
    ['Macro Pad 9', 'built', 'Hot-swap 9-key macro pad with a rotary encoder and per-key RGB.', ['RP2040', 'Kailh sockets', 'EC11 encoder', 'SK6812'], ['KiCad', 'QMK'], 2024],
    ['Film Scanner Rig', 'in-progress', '3D-printed rig + stepper that auto-advances 35mm film for camera scanning.', ['Arduino Nano', 'NEMA17', 'A4988', 'LED panel'], ['Fusion 360', 'Bambu P1S'], 2026],
    ['Desk Robot', 'in-progress', 'Two-servo desk companion that tracks faces and reacts to notifications.', ['ESP32-S3 Cam', 'SG90 servos', 'OLED 0.96"'], ['ESP-IDF', 'TFLite Micro'], 2026],
    ['LoRa Trail Tracker', 'planned', 'Off-grid GPS tracker for treks that relays position over LoRa mesh.', ['nRF52840', 'SX1262', 'u-blox M10'], ['Zephyr', 'Meshtastic'], 2027],
  ] as const
  for (const [i, [title, status, summary, components, tools, year]] of hw.entries()) {
    const cover = await upload(payload, 'hardware', i + 60, title, `${title} board`)
    await payload.create({
      collection: 'hardware',
      overrideAccess: true,
      data: {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        status,
        summary,
        details: 'Designed the schematic and PCB, printed the enclosure, and wrote firmware with OTA updates. Notes, BOM and files are in the repo.',
        components: [...components],
        tools: [...tools],
        year,
        cover,
        links: { repo: 'https://github.com/AdwaitNPradhan' },
        featured: i < 2,
        order: i,
        published: true,
      },
    })
  }

  log('seed: skills')
  const skills: [string, string, number][] = [
    ['TypeScript', 'frontend', 5], ['React', 'frontend', 5], ['Next.js', 'frontend', 5], ['Three.js / R3F', 'frontend', 4], ['GSAP', 'frontend', 4], ['Tailwind CSS', 'frontend', 5],
    ['Node.js', 'backend', 5], ['Go', 'backend', 3], ['PostgreSQL', 'backend', 4], ['MongoDB', 'backend', 4], ['Redis', 'backend', 4], ['GraphQL', 'backend', 3],
    ['React Native', 'mobile', 4], ['Expo', 'mobile', 4],
    ['Docker', 'devops', 4], ['Dokploy / self-hosting', 'devops', 4], ['CI/CD', 'devops', 4], ['Linux', 'devops', 4],
    ['ESP32 / Arduino', 'hardware', 4], ['KiCad PCB design', 'hardware', 3], ['3D printing', 'hardware', 3],
    ['Photography', 'creative', 5], ['Lightroom', 'creative', 4], ['Figma', 'tools', 4],
  ]
  for (const [i, [name, category, level]] of skills.entries()) {
    await payload.create({
      collection: 'skills',
      overrideAccess: true,
      data: { name, category: category as never, level, years: level + 1, featured: level >= 5, order: i, published: true },
    })
  }

  log('seed: experience')
  const exp = [
    ['Fleapo', 'Senior Full-stack Engineer', 'job', '2024-04-01', null, 'Lead web and mobile builds for client products; own infra on self-hosted Dokploy.', ['Shipped 6 products from zero to production', 'Cut infra cost 60% by moving to self-hosting', 'Mentored 4 engineers']],
    ['Freelance', 'Creative Developer', 'freelance', '2022-01-01', '2024-03-31', 'Interactive sites, 3D product pages and small games for brands.', ['Awwwards honorable mention (demo)', '15+ client launches']],
    ['Startup Co. (demo)', 'Software Engineer', 'job', '2020-07-01', '2021-12-31', 'Built the customer dashboard and billing flows.', ['Rebuilt billing, -40% support tickets']],
    ['University (demo)', 'B.Tech, Computer Science', 'education', '2016-07-01', '2020-06-30', 'Robotics club lead. Final project: autonomous line-following rover.', []],
  ] as const
  for (const [i, [org, role, kind, start, end, summary, highlights]] of exp.entries()) {
    await payload.create({
      collection: 'experience',
      overrideAccess: true,
      data: { org, role, kind, start, end: end ?? undefined, summary, highlights: highlights.map((text) => ({ text })), order: i, published: true },
    })
  }
  log('seed: done')
}

/** Test login used during the build phase. Wiped with `npm run seed -- --wipe`. */
export async function ensureTestEditor(payload: Payload, email: string, password: string) {
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true, limit: 1 })
  if (existing.totalDocs) return false
  await payload.create({ collection: 'users', overrideAccess: true, data: { email, password, name: 'Test Editor', roles: ['editor'] } })
  return true
}
