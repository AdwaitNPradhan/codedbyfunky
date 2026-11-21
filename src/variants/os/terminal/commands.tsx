import { version as reactVersion } from 'react'
import type { ReactNode } from 'react'
import type { SiteData } from '@/lib/types'
import { isAppId, META } from '../appmeta'
import type { useOS } from '../store'
import { ACCENTS, WALLS, type Accent, type AppId, type Wall } from '../types'
import { download, levelWord, monthYear, range, resumeFileName, slugify, social } from '../util'
import ui from '../apps/apps.module.css'

type OS = ReturnType<typeof useOS>

export type Ctx = {
  data: SiteData
  os: OS
  cwd: string[]
  setCwd: (p: string[]) => void
  history: string[]
  clear: () => void
  exec: (line: string) => void
}
export type Cmd = {
  desc: string
  usage?: string
  run: (args: string[], ctx: Ctx) => ReactNode | void | Promise<ReactNode | void>
}

/** Quote-aware tokenizer: `play "bug squash"` is two tokens. */
export function parse(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q: string | null = null
  let has = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === q) q = null
      else if (c === '\\' && q === '"' && i + 1 < line.length) cur += line[++i]
      else cur += c
    } else if (c === '"' || c === "'") {
      q = c
      has = true
    } else if (c === '\\' && i + 1 < line.length) {
      cur += line[++i]
      has = true
    } else if (/\s/.test(c)) {
      if (cur || has) out.push(cur)
      cur = ''
      has = false
    } else cur += c
  }
  if (cur || has) out.push(cur)
  return out
}

/* ───────── virtual file system ───────── */
type Node = { name: string; dir?: boolean; cat?: () => ReactNode; open?: () => void }

const Lines = ({ children }: { children: ReactNode }) => <div className={ui.tOut}>{children}</div>
const Dim = ({ children }: { children: ReactNode }) => <span className={ui.tDim}>{children}</span>
const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
)
const Run = ({ ctx, cmd, children }: { ctx: Ctx; cmd: string; children?: ReactNode }) => (
  <button type="button" className={ui.tLink} onClick={() => ctx.exec(cmd)}>
    {children ?? cmd}
  </button>
)

export function buildFS(data: SiteData, os: OS): Record<string, Node[]> {
  const s = data.settings
  const root: Node[] = [
    {
      name: 'about.txt',
      open: () => os.open('about'),
      cat: () => (
        <Lines>
          <div>{s.name}</div>
          <div>{s.roles.join(' · ')}</div>
          <br />
          <div className={ui.tWrap}>{s.longBio || s.shortBio}</div>
        </Lines>
      ),
    },
    { name: 'projects', dir: true },
    { name: 'photos', dir: true },
    { name: 'games', dir: true },
    { name: 'hardware', dir: true },
  ]
  if (s.resumeUrl)
    root.push({
      name: 'resume.pdf',
      open: () => os.open('resume'),
      cat: () => <Dim>binary file. Run `resume` to download it, or `open resume` to preview.</Dim>,
    })
  return {
    '': root,
    projects: data.projects.map((p) => ({
      name: `${p.slug}.md`,
      open: () => os.open('preview', { slug: p.slug }),
      cat: () => (
        <Lines>
          <div className={ui.tHead}># {p.title}</div>
          <div className={ui.tWrap}>{p.summary}</div>
          <Dim>{[p.role, p.client, p.year, p.stack.join(', ')].filter(Boolean).join(' · ')}</Dim>
          {p.problem && <div className={ui.tWrap}>{`\n## Problem\n${p.problem}`}</div>}
          {p.approach && <div className={ui.tWrap}>{`\n## Approach\n${p.approach}`}</div>}
          {p.outcome && <div className={ui.tWrap}>{`\n## Outcome\n${p.outcome}`}</div>}
          {p.links.live && (
            <div>
              {'\n'}live: <A href={p.links.live}>{p.links.live}</A>
            </div>
          )}
          {p.links.repo && (
            <div>
              repo: <A href={p.links.repo}>{p.links.repo}</A>
            </div>
          )}
        </Lines>
      ),
    })),
    photos: data.photos.map((p) => ({
      name: `${slugify(p.title)}.jpg`,
      open: () => os.open('photos', { photo: p.id }),
      cat: () => (
        <Lines>
          <div className={ui.tHead}>{p.title}</div>
          <Dim>{[p.location, monthYear(p.takenAt), p.series].filter(Boolean).join(' · ')}</Dim>
          <div>{[p.camera, p.lens, p.exposure].filter(Boolean).join(' · ')}</div>
        </Lines>
      ),
    })),
    games: data.games.map((g) => ({
      name: g.slug,
      open: () => os.open('game', { slug: g.slug }),
      cat: () => (
        <Lines>
          <div className={ui.tHead}>{g.title}</div>
          <div className={ui.tWrap}>{g.description || g.tagline}</div>
          <Dim>controls: {g.controls}</Dim>
        </Lines>
      ),
    })),
    hardware: data.hardware.map((h) => ({
      name: `${h.slug}.md`,
      open: () => os.open('lab', { slug: h.slug }),
      cat: () => (
        <Lines>
          <div className={ui.tHead}>
            # {h.title} [{h.status}]
          </div>
          <div className={ui.tWrap}>{h.summary}</div>
          <Dim>parts: {h.components.join(', ')}</Dim>
          <Dim>tools: {h.tools.join(', ')}</Dim>
        </Lines>
      ),
    })),
  }
}

export function resolvePath(cwd: string[], arg: string): string[] {
  const parts = arg.startsWith('/') || arg.startsWith('~') ? [] : [...cwd]
  for (const seg of arg.replace(/^~/, '').split('/').filter(Boolean)) {
    if (seg === '.') continue
    if (seg === '..') parts.pop()
    else parts.push(seg)
  }
  return parts
}

const lc = (s: string) => s.toLowerCase()
function findNode(
  fs: Record<string, Node[]>,
  path: string[],
): { dir: string; node: Node } | { dir: string; node: null } {
  if (path.length === 0) return { dir: '', node: { name: '/', dir: true } }
  const dir = path.length > 1 ? path[0] : ''
  const name = path[path.length - 1]
  const list = fs[dir]
  if (!list) return { dir, node: null }
  const node =
    list.find((n) => lc(n.name) === lc(name)) ??
    list.find((n) => lc(n.name.replace(/\.[a-z]+$/, '')) === lc(name)) ??
    null
  return { dir, node }
}

export const promptPath = (cwd: string[]) => (cwd.length ? `~/${cwd.join('/')}` : '~')

/* ───────── helpers ───────── */
const APP_ALIASES: Record<string, AppId> = {
  readme: 'about',
  about: 'about',
  files: 'files',
  projects: 'files',
  folder: 'files',
  photos: 'photos',
  photo: 'photos',
  games: 'games',
  lab: 'lab',
  hardware: 'lab',
  skills: 'skills',
  terminal: 'terminal',
  term: 'terminal',
  mail: 'mail',
  contact: 'mail',
  resume: 'resume',
  settings: 'settings',
  preferences: 'settings',
}

const findProject = (d: SiteData, q: string) => {
  const k = lc(q)
  return (
    d.projects.find((p) => p.slug === k) ??
    d.projects.find((p) => lc(p.title) === k) ??
    d.projects.find((p) => lc(p.title).includes(k) || p.slug.includes(slugify(k)))
  )
}
const findGame = (d: SiteData, q: string) => {
  const k = lc(q)
  return (
    d.games.find((g) => g.slug === k) ??
    d.games.find((g) => lc(g.title) === k) ??
    d.games.find((g) => lc(g.title).includes(k) || g.slug.includes(slugify(k)))
  )
}
const findHw = (d: SiteData, q: string) => {
  const k = lc(q)
  return (
    d.hardware.find((h) => h.slug === k) ??
    d.hardware.find((h) => lc(h.title).includes(k) || h.slug.includes(slugify(k)))
  )
}

const FORTUNES = [
  'It works on my machine. Ship the machine.',
  'There are two hard problems: cache invalidation, naming things, and off-by-one errors.',
  'A good commit message is a letter to your future self.',
  'Weeks of coding can save hours of planning.',
  'Make it work, make it right, make it fast. In that order.',
  'The best bug report comes with a reproduction.',
]

/* ───────── commands ───────── */
export const COMMANDS: Record<string, Cmd> = {
  help: {
    desc: 'list all commands',
    run: (_a, ctx) => (
      <Lines>
        <div className={ui.tHead}>Commands</div>
        <table className={ui.tTable}>
          <tbody>
            {Object.entries(COMMANDS)
              .filter(([k]) => !HIDDEN.has(k))
              .map(([k, c]) => (
                <tr key={k}>
                  <td>
                    <Run ctx={ctx} cmd={k}>
                      {k}
                    </Run>
                  </td>
                  <td>{c.desc}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <Dim>Tab completes. ↑/↓ history. Ctrl+L clears. Try `sudo hire funky`.</Dim>
      </Lines>
    ),
  },
  about: {
    desc: 'who I am',
    run: (_a, { data }) => (
      <Lines>
        <div className={ui.tHead}>{data.settings.name}</div>
        <div>{data.settings.roles.join(' · ')}</div>
        <div className={ui.tWrap}>{`\n${data.settings.longBio || data.settings.shortBio}`}</div>
        {data.settings.location && (
          <Dim>{`\n${[data.settings.location, data.settings.timezone].filter(Boolean).join(' · ')}`}</Dim>
        )}
      </Lines>
    ),
  },
  whoami: {
    desc: 'one-line intro',
    run: (_a, { data }) => (
      <Lines>
        {data.settings.name} ({data.settings.handle}):{' '}
        {data.settings.tagline || data.settings.shortBio}
      </Lines>
    ),
  },
  neofetch: {
    desc: 'system info for this site',
    run: (_a, { data }) => {
      const s = data.settings
      const rows: [string, string][] = [
        ['OS', 'FunkyOS 1.0'],
        ['Host', typeof window !== 'undefined' ? window.location.host : ''],
        ['Framework', `Next.js 16, React ${reactVersion}`],
        ['CMS', 'Payload 3 + MongoDB'],
        ['Fonts', 'Geist, Pixelify Sans, JetBrains Mono'],
        ['Motion', 'motion (spring windows and dock)'],
        [
          'Content',
          `${data.projects.length} projects, ${data.photos.length} photos, ${data.games.length} games, ${data.hardware.length} hardware builds`,
        ],
        ['Roles', s.roles.join(', ')],
      ]
      return (
        <div className={ui.neo}>
          <pre aria-hidden="true">{`███████╗\n██╔════╝\n█████╗  \n██╔══╝  \n██║     \n╚═╝     `}</pre>
          <div>
            <div className={ui.tHead}>{s.handle}@funkyos</div>
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <span className={ui.tKey}>{k}</span> {v}
                </div>
              ))}
            <div className={ui.swatches} aria-hidden="true">
              {['#FF6B35', '#FFD166', '#A8FF9E', '#2F6F6A', '#ECE7DA'].map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      )
    },
  },
  projects: {
    desc: 'list projects, or show one',
    usage: 'projects [--stack react] [n]',
    run: (args, ctx) => {
      const { data } = ctx
      let stack = ''
      let n = ''
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--stack') stack = args[++i] ?? ''
        else n = args[i]
      }
      let list = data.projects
      if (stack) list = list.filter((p) => p.stack.some((s) => lc(s).includes(lc(stack))))
      if (n) {
        const p = /^\d+$/.test(n) ? list[Number(n) - 1] : findProject(data, n)
        if (!p) return `no project matches "${n}". Run \`projects\`.`
        return (
          <>
            {buildFS(data, ctx.os).projects.find((x) => x.name === `${p.slug}.md`)!.cat!()}
            <Run ctx={ctx} cmd={`open ${p.slug}`}>
              → open preview window
            </Run>
          </>
        )
      }
      if (!list.length) return stack ? `no projects use "${stack}".` : 'no projects yet.'
      return (
        <Lines>
          {list.map((p, i) => (
            <div key={p.id} className={ui.tRow}>
              <Dim>{String(i + 1).padStart(2, ' ')}</Dim>{' '}
              <Run ctx={ctx} cmd={`open ${p.slug}`}>
                {p.title}
              </Run>{' '}
              <Dim>{p.year ?? ''}</Dim>
              <div className={ui.tIndent}>
                {p.summary} <Dim>[{p.stack.join(', ')}]</Dim>
              </div>
            </div>
          ))}
          <Dim>{'\n'}`projects 2` shows details. `projects --stack react` filters.</Dim>
        </Lines>
      )
    },
  },
  open: {
    desc: 'open an app, project, game or file',
    usage: 'open <app | slug>',
    run: (args, ctx) => {
      const q = args.join(' ').trim()
      if (!q)
        return 'usage: open <app | project | game | hardware>. Apps: about, files, photos, games, lab, skills, terminal, mail, resume, settings.'
      const { os, data } = ctx
      const app = APP_ALIASES[lc(q)] ?? (isAppId(lc(q)) ? (lc(q) as AppId) : null)
      if (app && app !== 'preview' && app !== 'game') {
        os.open(app, app === 'files' ? { path: 'projects' } : {})
        return `opening ${META[app].label}…`
      }
      const p = findProject(data, q)
      if (p) {
        os.open('preview', { slug: p.slug })
        return `opening ${p.title}…`
      }
      const g = findGame(data, q)
      if (g) {
        os.open('game', { slug: g.slug })
        return `launching ${g.title}…`
      }
      const h = findHw(data, q)
      if (h) {
        os.open('lab', { slug: h.slug })
        return `opening ${h.title} in Lab…`
      }
      return `cannot open "${q}". Try \`ls\` or \`help\`.`
    },
  },
  ls: {
    desc: 'list files',
    usage: 'ls [path]',
    run: (args, ctx) => {
      const fs = buildFS(ctx.data, ctx.os)
      const path = resolvePath(ctx.cwd, args[0] ?? '')
      const key = path.length === 0 ? '' : path[0]
      if (path.length > 1 || (key && !fs[key])) {
        const f = findNode(fs, path)
        return f.node ? args[0] : `ls: ${args[0]}: no such file or directory`
      }
      return (
        <div className={ui.tLs}>
          {fs[key].map((n) => (
            <Run
              key={n.name}
              ctx={ctx}
              cmd={
                n.dir ? `cd ${[...path, n.name].join('/')}` : `cat ${[...path, n.name].join('/')}`
              }
            >
              <span className={n.dir ? ui.tDir : ''}>
                {n.name}
                {n.dir ? '/' : ''}
              </span>
            </Run>
          ))}
        </div>
      )
    },
  },
  cd: {
    desc: 'change directory',
    usage: 'cd <dir>',
    run: (args, ctx) => {
      const path = resolvePath(ctx.cwd, args[0] ?? '~')
      const fs = buildFS(ctx.data, ctx.os)
      if (path.length === 0) return ctx.setCwd([])
      if (path.length === 1 && fs[lc(path[0])] && path[0] !== '') return ctx.setCwd([lc(path[0])])
      return `cd: ${args[0]}: not a directory`
    },
  },
  pwd: { desc: 'print working directory', run: (_a, ctx) => `/${ctx.cwd.join('/')}` },
  cat: {
    desc: 'print a file',
    usage: 'cat <file>',
    run: (args, ctx) => {
      if (!args[0]) return 'usage: cat <file>. Try `ls`.'
      const fs = buildFS(ctx.data, ctx.os)
      const { node } = findNode(fs, resolvePath(ctx.cwd, args[0]))
      if (!node) return `cat: ${args[0]}: no such file`
      if (node.dir) return `cat: ${args[0]}: is a directory`
      return node.cat?.() ?? ''
    },
  },
  photos: {
    desc: 'open the Photos app',
    run: (_a, { os }) => {
      os.open('photos')
      return 'opening Photos…'
    },
  },
  instagram: {
    desc: 'open my Instagram profile',
    run: (_a, { data, os }) => {
      const url = data.settings.instagram.url
      if (!url) return 'no Instagram link in the CMS yet.'
      os.external(url)
      return (
        <>
          opening <A href={url}>{data.settings.instagram.handle || url}</A>…
        </>
      )
    },
  },
  games: {
    desc: 'list games',
    run: (_a, ctx) => (
      <Lines>
        {ctx.data.games.map((g) => (
          <div key={g.id} className={ui.tRow}>
            <Run ctx={ctx} cmd={`play ${g.slug}`}>
              {g.slug}
            </Run>{' '}
            <Dim>{g.tagline}</Dim>
          </div>
        ))}
        <Dim>{'\n`play <name>` launches one in its own window.'}</Dim>
      </Lines>
    ),
  },
  play: {
    desc: 'launch a game',
    usage: 'play <game>',
    run: (args, { data, os }) => {
      const q = args.join(' ').trim()
      if (!q) return `usage: play <game>. Games: ${data.games.map((g) => g.slug).join(', ')}`
      const g = findGame(data, q)
      if (!g) return `no game called "${q}". Run \`games\`.`
      os.open('game', { slug: g.slug })
      return `launching ${g.title}…`
    },
  },
  hardware: {
    desc: 'list hardware builds',
    run: (_a, ctx) => (
      <Lines>
        {ctx.data.hardware.map((h) => (
          <div key={h.id} className={ui.tRow}>
            <Run ctx={ctx} cmd={`open ${h.slug}`}>
              {h.title}
            </Run>{' '}
            <Dim>[{h.status}]</Dim> {h.summary}
          </div>
        ))}
      </Lines>
    ),
  },
  skills: {
    desc: 'list skills with level',
    run: (_a, { data }) => (
      <Lines>
        {data.skills.length === 0 ? 'no skills yet.' : null}
        {data.skills.map((s) => (
          <div key={s.id} className={ui.tRow}>
            {s.name.padEnd(24, ' ')} <Dim>{s.category.padEnd(10, ' ')}</Dim> {levelWord(s.level)}
          </div>
        ))}
      </Lines>
    ),
  },
  exp: {
    desc: 'work and education timeline',
    run: (_a, { data }) => (
      <Lines>
        {data.experience.length === 0 ? 'no entries yet.' : null}
        {data.experience.map((e) => (
          <div key={e.id} className={ui.tRow}>
            <Dim>{range(e.start, e.end).padEnd(22, ' ')}</Dim> {e.role} · {e.org}
          </div>
        ))}
      </Lines>
    ),
  },
  contact: {
    desc: 'open Mail',
    run: (_a, { os, data }) => {
      os.open('mail')
      return (
        <>
          opening Mail… or write to{' '}
          <A href={`mailto:${data.settings.publicEmail ?? ''}`}>
            {data.settings.publicEmail ?? 'the form'}
          </A>
        </>
      )
    },
  },
  email: {
    desc: 'show my email address',
    run: (_a, { data }) =>
      data.settings.publicEmail ? (
        <A href={`mailto:${data.settings.publicEmail}`}>{data.settings.publicEmail}</A>
      ) : (
        'no public email set. Use `contact`.'
      ),
  },
  github: {
    desc: 'open GitHub',
    run: (_a, { data, os }) => {
      const u = social(data, 'github')
      if (!u) return 'no GitHub link in the CMS yet.'
      os.external(u)
      return <A href={u}>{u}</A>
    },
  },
  linkedin: {
    desc: 'open LinkedIn',
    run: (_a, { data, os }) => {
      const u = social(data, 'linkedin')
      if (!u) return 'no LinkedIn link in the CMS yet.'
      os.external(u)
      return <A href={u}>{u}</A>
    },
  },
  resume: {
    desc: 'download the resume PDF',
    run: (_a, { data }) => {
      const u = data.settings.resumeUrl
      if (!u) return 'no resume uploaded yet. Try `contact`.'
      const name = resumeFileName(u, data.settings.name)
      download(u, name)
      return `downloading ${name}…`
    },
  },
  theme: {
    desc: 'change wallpaper or accent',
    usage: 'theme <teal|ember|slate> | theme accent <orange|sun|mint|rose>',
    run: (args, { os }) => {
      if (!args.length)
        return `wallpaper: ${WALLS.join(', ')} (now ${os.settings.wall}). accent: ${ACCENTS.join(', ')} (now ${os.settings.accent}). usage: theme <name> | theme accent <name>`
      if (args[0] === 'accent') {
        const a = lc(args[1] ?? '') as Accent
        if (!ACCENTS.includes(a)) return `unknown accent. Options: ${ACCENTS.join(', ')}`
        os.setSettings({ accent: a })
        return `accent set to ${a}.`
      }
      const w = lc(args[0]) as Wall
      if (!WALLS.includes(w)) return `unknown theme "${args[0]}". Options: ${WALLS.join(', ')}`
      os.setSettings({ wall: w })
      return `theme set to ${w}.`
    },
  },
  sound: {
    desc: 'sound on|off',
    usage: 'sound on|off',
    run: (args, { os }) => {
      const v = lc(args[0] ?? '')
      if (v !== 'on' && v !== 'off')
        return `sound is ${os.settings.sound ? 'on' : 'off'}. usage: sound on|off`
      os.setSettings({ sound: v === 'on' })
      return `sound ${v}.`
    },
  },
  clear: { desc: 'clear the screen (Ctrl+L)', run: (_a, ctx) => ctx.clear() },
  history: {
    desc: 'show command history',
    run: (_a, { history }) => (
      <Lines>
        {history.length
          ? history.map((h, i) => (
              <div key={i}>
                {String(i + 1).padStart(3, ' ')} {h}
              </div>
            ))
          : 'empty.'}
      </Lines>
    ),
  },
  date: { desc: 'print the date', run: () => new Date().toString() },
  echo: { desc: 'print text', usage: 'echo <text>', run: (args) => args.join(' ') },
  sudo: {
    desc: 'run as admin (try it)',
    usage: 'sudo hire funky',
    run: (args, { os }) => {
      const line = args.join(' ').toLowerCase()
      if (line === 'hire funky' || line === 'hire me') {
        os.fireConfetti()
        os.open('mail', { subject: "Let's talk" })
        return <span className={ui.tGood}>permission granted. Good call. Opening Mail…</span>
      }
      return `${args[0] ?? 'user'}: you are not in the sudoers file. This incident will be reported. (Try: sudo hire funky)`
    },
  },
  fortune: {
    desc: 'a small dev proverb',
    run: () => FORTUNES[Math.floor(Math.random() * FORTUNES.length)],
  },
  cowsay: {
    desc: 'a talking cow',
    usage: 'cowsay <text>',
    run: (args) => {
      const t = (args.join(' ') || 'hire funky').slice(0, 40)
      return (
        <pre
          className={ui.tPre}
        >{` ${'_'.repeat(t.length + 2)}\n< ${t} >\n ${'-'.repeat(t.length + 2)}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`}</pre>
      )
    },
  },
  rm: {
    desc: 'remove files (read-only)',
    run: (args) =>
      args.join(' ').includes('/')
        ? 'nice try. FunkyOS is mounted read-only.'
        : 'rm: this filesystem is read-only.',
  },
  vim: {
    desc: 'editor (no escape)',
    run: () => 'you are now in vim. Just kidding. Type :q to... no wait, that is not a thing here.',
  },
  exit: { desc: 'close this terminal', run: (_a, { os }) => void os.close('terminal') },
  shutdown: { desc: 'shut FunkyOS down', run: (_a, { os }) => void os.shutdown() },
}

const HIDDEN = new Set(['fortune', 'cowsay', 'rm', 'vim', 'shutdown'])
export const COMMAND_NAMES = Object.keys(COMMANDS)

/** Tab completion for the command, project and game slugs, file names, apps and themes. */
export function complete(line: string, ctx: Ctx): string[] {
  const endsSpace = /\s$/.test(line)
  const toks = line.trimStart().split(/\s+/)
  const word = endsSpace ? '' : (toks.pop() ?? '')
  const cmd = toks[0]
  if (toks.length === 0) return COMMAND_NAMES.filter((c) => c.startsWith(lc(word)))
  const fs = buildFS(ctx.data, ctx.os)
  const pool: string[] = []
  const add = (xs: string[]) => pool.push(...xs)
  if (cmd === 'open')
    add([
      ...Object.keys(APP_ALIASES),
      ...ctx.data.projects.map((p) => p.slug),
      ...ctx.data.games.map((g) => g.slug),
      ...ctx.data.hardware.map((h) => h.slug),
    ])
  else if (cmd === 'play') add(ctx.data.games.map((g) => g.slug))
  else if (cmd === 'projects') add([...ctx.data.projects.map((p) => p.slug), '--stack'])
  else if (cmd === 'theme') add([...WALLS, 'accent', ...ACCENTS])
  else if (cmd === 'sound') add(['on', 'off'])
  else if (cmd === 'cd' || cmd === 'ls' || cmd === 'cat') {
    const slash = word.lastIndexOf('/')
    const base = slash >= 0 ? word.slice(0, slash + 1) : ''
    const dirPath = resolvePath(ctx.cwd, base)
    const key = dirPath[0] ?? ''
    const names = (fs[key] ?? [])
      .filter((n) => (cmd === 'cd' ? n.dir : true))
      .map((n) => base + n.name + (n.dir ? '/' : ''))
    return Array.from(new Set(names)).filter((n) => lc(n).startsWith(lc(word)))
  }
  return Array.from(new Set(pool)).filter((c) => lc(c).startsWith(lc(word)))
}

export const commonPrefix = (xs: string[]) =>
  xs.reduce((a, b) => {
    let i = 0
    while (i < a.length && i < b.length && lc(a[i]) === lc(b[i])) i++
    return a.slice(0, i)
  })
