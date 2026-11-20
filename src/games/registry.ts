import type { ComponentType } from 'react'
import type { GameKey } from './keys'
import type { GameProps } from './types'

type Loader = () => Promise<{ default: ComponentType<GameProps> }>

/** Each game is its own lazy chunk — nothing loads until a visitor presses Play. */
export const gameLoaders: Record<GameKey, Loader> = {
  'bug-squash': () => import('./bug-squash/Game'),
  'commit-snake': () => import('./commit-snake/Game'),
  'deploy-dash': () => import('./deploy-dash/Game'),
  'shutter-snap': () => import('./shutter-snap/Game'),
  'circuit-flow': () => import('./circuit-flow/Game'),
  'hotfix-typer': () => import('./hotfix-typer/Game'),
  'orbit-sling': () => import('./orbit-sling/Game'),
  'server-stack': () => import('./server-stack/Game'),
}
