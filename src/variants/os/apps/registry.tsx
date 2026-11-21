'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { AppId, AppProps, WinState } from '../types'
import About from './About'
import ui from './apps.module.css'

const Loading = () => (
  <div className={ui.loading} role="status">
    Loading…
  </div>
)
const lazy = (load: () => Promise<{ default: ComponentType<AppProps> }>) =>
  dynamic(load, { ssr: false, loading: Loading })

/** Shell and About ship in the first chunk. Every other app loads on first open. */
const VIEWS: Record<AppId, ComponentType<AppProps>> = {
  about: About,
  files: lazy(() => import('./Files')),
  preview: lazy(() => import('./Preview')),
  photos: lazy(() => import('./Photos')),
  games: lazy(() => import('./Games')),
  game: lazy(() => import('./GameWindow')),
  lab: lazy(() => import('./Lab')),
  skills: lazy(() => import('./Skills')),
  terminal: lazy(() => import('./Terminal')),
  mail: lazy(() => import('./Mail')),
  resume: lazy(() => import('./Resume')),
  settings: lazy(() => import('./Settings')),
  browser: lazy(() => import('./Browser')),
}

export function AppView({
  win,
  active,
  hidden,
}: {
  win: WinState
  active: boolean
  hidden: boolean
}) {
  const View = VIEWS[win.app]
  return <View id={win.id} props={win.props} active={active} hidden={hidden} />
}
