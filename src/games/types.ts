/**
 * Contract every mini-game implements.
 *
 * Theming: games read these CSS custom properties from their container element
 * (set them on any ancestor): --game-bg, --game-fg, --game-accent, --game-accent-2, --game-muted.
 * Font: inherit from the container.
 */
export type GameProps = {
  /** Called whenever the score changes; final score on game over. */
  onScore?: (score: number) => void
  /** Called on game over with the final score. */
  onGameOver?: (score: number) => void
  /** Grab keyboard focus on mount (true when launched from a Play button). */
  autoFocus?: boolean
}
