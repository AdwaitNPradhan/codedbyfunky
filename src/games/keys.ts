/** Game registry keys. Pure data (no imports) so the Payload config can use it for the CMS select. */
export const GAME_KEYS = [
  'bug-squash',
  'commit-snake',
  'deploy-dash',
  'shutter-snap',
  'circuit-flow',
  'hotfix-typer',
  'orbit-sling',
  'server-stack',
] as const

export type GameKey = (typeof GAME_KEYS)[number]

export const GAME_LABELS: Record<GameKey, string> = {
  'bug-squash': 'Bug Squash',
  'commit-snake': 'Commit Snake',
  'deploy-dash': 'Deploy Dash',
  'shutter-snap': 'Shutter Snap',
  'circuit-flow': 'Circuit Flow',
  'hotfix-typer': 'Hotfix Typer',
  'orbit-sling': 'Orbit Sling',
  'server-stack': 'Server Stack',
}

export const isGameKey = (k: string): k is GameKey => (GAME_KEYS as readonly string[]).includes(k)
