const k = (key: string) => `codedbyfunky:game:${key}:best`

export function loadBest(key: string): number {
  try {
    const n = Number(localStorage.getItem(k(key)))
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export function saveBest(key: string, n: number) {
  try {
    localStorage.setItem(k(key), String(n))
  } catch {
    /* private mode / blocked storage */
  }
}
