'use client'

import { useState } from 'react'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { Empty, Ext } from './common'
import ui from './apps.module.css'

/** The official Spotify embed. The URL comes from the CMS and is rebuilt on the server from a strict link. */
export default function Spotify(_: AppProps) {
  const sp = useOS().data.settings.spotify
  const [loaded, setLoaded] = useState(false)
  if (!sp)
    return (
      <Empty>No playlist yet. Add a Spotify link in the CMS (Site settings, Links tab).</Empty>
    )
  return (
    <div className={ui.spotify}>
      <div className={ui.spStage}>
        {/* The embed has its own rounded corners. A dark clip box behind and around it keeps the window panel from showing in them. */}
        <div className={ui.spClip}>
          <iframe
            className={ui.spFrame}
            title={`${sp.label} on Spotify`}
            src={sp.src}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
        </div>
        <div className={`${ui.bLoad} ${loaded ? ui.bLoadDone : ''}`} role="status">
          {loaded ? null : (
            <>
              <p>Connecting to Spotify…</p>
              <span className={ui.bTrack} aria-hidden="true">
                <i />
              </span>
            </>
          )}
        </div>
      </div>
      <p className={ui.spFoot}>
        Music keeps playing when you minimise this window. Sign in to Spotify in this browser for
        full tracks. <Ext href={sp.url}>Open in Spotify ↗</Ext>
      </p>
    </div>
  )
}
