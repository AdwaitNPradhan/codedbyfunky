'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { hasWebGL, isLowPower } from '../hooks'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { Empty } from './common'
import ui from './apps.module.css'

const ModelScene = dynamic(() => import('./ModelScene'), {
  ssr: false,
  loading: () => (
    <div className={ui.loading} role="status">
      Loading 3D…
    </div>
  ),
})

/** Interactive 3D board for a hardware project. three.js loads only when this window opens. */
export default function Model3D({ props, hidden }: AppProps) {
  const os = useOS()
  const h = os.data.hardware.find((x) => x.slug === props.slug)
  const [gl, setGl] = useState<boolean | null>(null)
  const [low, setLow] = useState(false)
  useEffect(() => {
    setGl(hasWebGL())
    setLow(isLowPower())
  }, [])
  if (!h) return <Empty>That hardware project is no longer in the CMS.</Empty>

  const parts = (h.components.length ? h.components : ['MCU', 'Sensor', 'Regulator', 'Connector']).slice(0, 12)
  const simple = os.reduced || low || os.mobile
  return (
    <div className={ui.model}>
      <div className={ui.mStage}>
        {gl === null ? null : gl && !hidden ? (
          <ModelScene autoRotate={!os.reduced} simple={simple} />
        ) : !gl ? (
          <div className={ui.mFallback}>
            {h.cover && <Pic img={h.cover} size="card" sizes="520px" />}
            <p>3D needs WebGL, which this browser does not have. Here is the photo instead.</p>
          </div>
        ) : null}
        <p className={ui.mHint}>Drag to turn · scroll or pinch to zoom</p>
      </div>
      <aside className={ui.mSide}>
        <h2 className={ui.pTitle} style={{ fontSize: 20 }}>
          {h.title}
        </h2>
        <p className={ui.dim}>{h.summary}</p>
        <h3 className={ui.h3}>Parts</h3>
        <ul className={ui.mParts}>
          {parts.map((n) => (
            <li key={n}>
              <span>{n}</span>
            </li>
          ))}
        </ul>
        <div className={ui.ctaRow}>
          <button type="button" className={ui.btn} onClick={() => os.open('lab', { slug: h.slug })}>
            Open in Lab
          </button>
          <button type="button" className={ui.btn} onClick={() => os.share('model', { slug: h.slug })}>
            Share
          </button>
        </div>
        <p className={ui.dim} style={{ fontSize: 12 }}>
          A stand-in dev board, not this exact build. The parts come from the project’s part list. 3D model:{' '}
          <a href="https://poly.pizza/m/2BEJQybmqQT" target="_blank" rel="noopener noreferrer">
            Arduino Uno by M Ferrieu
          </a>
          , CC BY.
        </p>
      </aside>
    </div>
  )
}
