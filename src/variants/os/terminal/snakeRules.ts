/** Snake rules for the terminal game. Pure, so a script can test them without a browser. */
export const COLS = 18
export const ROWS = 12
type P = { x: number; y: number }
export type Dir = 'up' | 'down' | 'left' | 'right'
const D: Record<Dir, P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
export const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
export type Game = { snake: P[]; dir: Dir; food: P; score: number; over: boolean }

export const at = (ps: P[], x: number, y: number) => ps.some((p) => p.x === x && p.y === y)

/** A random free cell. Off the board when the snake fills it, so nothing more to eat. */
export function placeFood(snake: P[], rand = Math.random): P {
  const free: P[] = []
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!at(snake, x, y)) free.push({ x, y })
  return free[Math.floor(rand() * free.length)] ?? { x: -1, y: -1 }
}

export function newGame(rand = Math.random): Game {
  const y = ROWS >> 1
  const snake = [{ x: 5, y }, { x: 4, y }, { x: 3, y }]
  return { snake, dir: 'right', food: placeFood(snake, rand), score: 0, over: false }
}

/** One tick. A wall or the snake's own body ends the game; a reverse turn is ignored. */
export function step(g: Game, want: Dir, rand = Math.random): Game {
  if (g.over) return g
  const dir = want === OPP[g.dir] ? g.dir : want
  const head = { x: g.snake[0].x + D[dir].x, y: g.snake[0].y + D[dir].y }
  const eats = head.x === g.food.x && head.y === g.food.y
  // The tail moves out of its cell this tick, unless the snake grows.
  const body = eats ? g.snake : g.snake.slice(0, -1)
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || at(body, head.x, head.y))
    return { ...g, dir, over: true }
  const snake = [head, ...body]
  return { snake, dir, food: eats ? placeFood(snake, rand) : g.food, score: g.score + (eats ? 1 : 0), over: false }
}
