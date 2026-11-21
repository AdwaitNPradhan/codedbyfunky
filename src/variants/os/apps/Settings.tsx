'use client'

import { useOS } from '../store'
import { ACCENTS, WALLS, type AppProps } from '../types'
import ui from './apps.module.css'

const WALL_LABEL = { teal: 'Teal harbour', ember: 'Ember dusk', slate: 'Slate night' } as const
const ACCENT_HEX = { orange: '#ff6b35', sun: '#ffc83d', mint: '#5ee0a0', rose: '#ff8fb1' } as const

export default function Settings(_: AppProps) {
  const os = useOS()
  const s = os.settings
  return (
    <div className={`${ui.scroll} ${ui.settings}`}>
      <fieldset className={ui.fieldset}>
        <legend>Wallpaper</legend>
        <div className={ui.radios}>
          {WALLS.map((w) => (
            <label key={w} className={ui.radio}>
              <input type="radio" name="wall" checked={s.wall === w} onChange={() => os.setSettings({ wall: w })} />
              <span data-wall={w} className={ui.wallSwatch} />
              {WALL_LABEL[w]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={ui.fieldset}>
        <legend>Accent</legend>
        <div className={ui.radios}>
          {ACCENTS.map((a) => (
            <label key={a} className={ui.radio}>
              <input type="radio" name="accent" checked={s.accent === a} onChange={() => os.setSettings({ accent: a })} />
              <span className={ui.accentSwatch} style={{ background: ACCENT_HEX[a] }} />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={ui.fieldset}>
        <legend>Behaviour</legend>
        <label className={ui.check}>
          <input type="checkbox" checked={s.reduceMotion} onChange={(e) => os.setSettings({ reduceMotion: e.target.checked })} />
          Reduce motion
        </label>
        <label className={ui.check}>
          <input type="checkbox" checked={s.wall3d} onChange={(e) => os.setSettings({ wall3d: e.target.checked })} />
          3D wallpaper (desktop with a mouse; off on phones and with reduced motion)
        </label>
        <label className={ui.check}>
          <input type="checkbox" checked={s.sound} onChange={(e) => os.setSettings({ sound: e.target.checked })} />
          Sound effects (off by default)
        </label>
      </fieldset>
      <p className={ui.dim}>Saved in this browser only.</p>
      <div className={ui.ctaRow}>
        <button type="button" className={ui.btn} onClick={os.plain}>
          Switch to plain page
        </button>
        <button type="button" className={ui.btn} onClick={() => os.setSettings({ wall: 'teal', accent: 'orange', reduceMotion: false, sound: false, wall3d: true })}>
          Reset
        </button>
      </div>
    </div>
  )
}
