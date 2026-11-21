/**
 * The v86 side of the Linux app: files, loading with real byte counts, and the keyboard.
 * Nothing here runs until the visitor starts the VM. v86 is BSD-2; see docs/CREDITS.md for all licenses.
 */

/** The parts of the v86 emulator object that the app uses. */
export type V86Emu = {
  run(): Promise<void>
  stop(): Promise<void>
  destroy(): Promise<void>
  restart(): void
  is_running(): boolean
  add_listener(event: string, cb: (arg: unknown) => void): void
  keyboard_send_text(text: string): void
  keyboard_send_scancodes(codes: number[]): void
}
declare global {
  interface Window {
    V86?: new (opts: Record<string, unknown>) => V86Emu
  }
}

export const FILES = {
  lib: '/linux/libv86-v1.js',
  wasm: '/linux/v1-v86.wasm',
  wasmFallback: '/linux/v1-v86-fallback.wasm',
  bios: '/linux/seabios-v1.bin',
  vga: '/linux/vgabios-v1.bin',
  kernel: '/linux/buildroot-v1.bin',
} as const
/** Uncompressed sizes in bytes. A server may send them compressed, but the decoded bytes always add up to these. */
export const SIZES = { wasm: 2_007_347, bios: 131_072, vga: 36_352, kernel: 10_068_480 } as const
export const TOTAL_BYTES = SIZES.wasm + SIZES.bios + SIZES.vga + SIZES.kernel
export const RAM_BYTES = 64 * 1024 * 1024

let lib: Promise<void> | null = null
/** Load libv86.js (a plain script, same origin) once. */
export function loadLib(): Promise<void> {
  if (window.V86) return Promise.resolve()
  lib ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = FILES.lib
    s.async = true
    s.onload = () => (window.V86 ? resolve() : reject(new Error('v86 did not start')))
    s.onerror = () => {
      lib = null
      reject(new Error('Could not load the emulator'))
    }
    document.head.appendChild(s)
  })
  return lib
}

/** Download a file and report every chunk, so the progress bar shows real bytes. */
export async function fetchBytes(
  url: string,
  onBytes: (n: number) => void,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  if (!res.body) {
    const buf = await res.arrayBuffer()
    onBytes(buf.byteLength)
    return buf
  }
  const reader = res.body.getReader()
  const parts: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    size += value.length
    onBytes(value.length)
  }
  const out = new Uint8Array(size)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out.buffer
}

/** Download everything the VM needs, then start it. Resolves when the emulator object exists. */
export async function startVm(opts: {
  screen: HTMLElement
  signal: AbortSignal
  onBytes: (n: number) => void
}): Promise<V86Emu> {
  const { screen, signal, onBytes } = opts
  await loadLib()
  const [wasm, bios, vga, kernel] = await Promise.all([
    fetchBytes(FILES.wasm, onBytes, signal),
    fetchBytes(FILES.bios, onBytes, signal),
    fetchBytes(FILES.vga, onBytes, signal),
    fetchBytes(FILES.kernel, onBytes, signal),
  ])
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  const V86 = window.V86!
  return new V86({
    // We downloaded the wasm ourselves (with progress). The fallback build is for browsers that cannot run the main one.
    wasm_fn: async (imports: WebAssembly.Imports) => {
      try {
        return (await WebAssembly.instantiate(wasm, imports)).instance.exports
      } catch {
        const fb = await fetchBytes(FILES.wasmFallback, () => {}, signal)
        return (await WebAssembly.instantiate(fb, imports)).instance.exports
      }
    },
    memory_size: RAM_BYTES,
    vga_memory_size: 2 * 1024 * 1024,
    screen: { container: screen, use_graphical_text: true },
    bios: { buffer: bios },
    vga_bios: { buffer: vga },
    bzimage: { buffer: kernel },
    cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on',
    autostart: true,
    // No network_relay_url: the VM has no network. The keyboard is ours, so FunkyOS shortcuts keep working.
    disable_keyboard: true,
    disable_mouse: true,
    disable_speaker: true,
  })
}

/* ───────── keyboard ───────── */
// PC scan codes (set 1). A code starting with 0xe0 is an extended key.
const SC: Record<string, number[]> = {
  Escape: [0x01], Minus: [0x0c], Equal: [0x0d], Backspace: [0x0e], Tab: [0x0f],
  BracketLeft: [0x1a], BracketRight: [0x1b], Enter: [0x1c], NumpadEnter: [0xe0, 0x1c],
  ControlLeft: [0x1d], ControlRight: [0xe0, 0x1d], Semicolon: [0x27], Quote: [0x28], Backquote: [0x29],
  ShiftLeft: [0x2a], ShiftRight: [0x36], Backslash: [0x2b], Comma: [0x33], Period: [0x34], Slash: [0x35],
  AltLeft: [0x38], AltRight: [0xe0, 0x38], Space: [0x39], CapsLock: [0x3a],
  ArrowUp: [0xe0, 0x48], ArrowLeft: [0xe0, 0x4b], ArrowRight: [0xe0, 0x4d], ArrowDown: [0xe0, 0x50],
  Home: [0xe0, 0x47], End: [0xe0, 0x4f], PageUp: [0xe0, 0x49], PageDown: [0xe0, 0x51],
  Insert: [0xe0, 0x52], Delete: [0xe0, 0x53],
}
'1234567890'.split('').forEach((c, i) => (SC[`Digit${c}`] = [0x02 + i]))
'QWERTYUIOP'.split('').forEach((c, i) => (SC[`Key${c}`] = [0x10 + i]))
'ASDFGHJKL'.split('').forEach((c, i) => (SC[`Key${c}`] = [0x1e + i]))
'ZXCVBNM'.split('').forEach((c, i) => (SC[`Key${c}`] = [0x2c + i]))
for (let i = 1; i <= 10; i++) SC[`F${i}`] = [0x3a + i]

// US layout: character -> [shift needed, key]. v86's own text helper needs its keyboard adapter, which we turn off.
const SHIFTED = '!@#$%^&*()'
const PUNCT: Record<string, [boolean, string]> = {
  ' ': [false, 'Space'], '-': [false, 'Minus'], _: [true, 'Minus'], '=': [false, 'Equal'], '+': [true, 'Equal'],
  '[': [false, 'BracketLeft'], '{': [true, 'BracketLeft'], ']': [false, 'BracketRight'], '}': [true, 'BracketRight'],
  ';': [false, 'Semicolon'], ':': [true, 'Semicolon'], "'": [false, 'Quote'], '"': [true, 'Quote'],
  '`': [false, 'Backquote'], '~': [true, 'Backquote'], '\\': [false, 'Backslash'], '|': [true, 'Backslash'],
  ',': [false, 'Comma'], '<': [true, 'Comma'], '.': [false, 'Period'], '>': [true, 'Period'],
  '/': [false, 'Slash'], '?': [true, 'Slash'],
}
function charKey(ch: string): [boolean, string] | null {
  if (/[a-z]/.test(ch)) return [false, `Key${ch.toUpperCase()}`]
  if (/[A-Z]/.test(ch)) return [true, `Key${ch}`]
  if (/[0-9]/.test(ch)) return [false, `Digit${ch}`]
  const i = SHIFTED.indexOf(ch)
  if (i >= 0) return [true, `Digit${(i + 1) % 10}`]
  return PUNCT[ch] ?? null
}
/** Type text on the US keyboard. Characters it cannot type are skipped. */
export function sendText(emu: V86Emu, text: string) {
  const codes: number[] = []
  for (const ch of text) {
    if (ch === '\n' || ch === '\r') {
      codes.push(...make(SC.Enter), ...brk(SC.Enter))
      continue
    }
    const k = charKey(ch)
    if (!k) continue
    const [shift, name] = k
    if (shift) codes.push(...make(SC.ShiftLeft))
    codes.push(...make(SC[name]), ...brk(SC[name]))
    if (shift) codes.push(...brk(SC.ShiftLeft))
  }
  if (codes.length) emu.keyboard_send_scancodes(codes)
}

/** Make code for a key press, and the break code (the same with bit 7 set) for the release. */
const make = (code: number[]) => code
const brk = (code: number[]) => code.map((c, i) => (i === code.length - 1 ? c | 0x80 : c))

/**
 * Send a key to the VM. Plain characters go as text, so any keyboard layout types the right letter.
 * Everything else (Enter, arrows, Ctrl combinations) goes as scan codes. Returns true if the key was used.
 */
export function sendKey(emu: V86Emu, e: KeyboardEvent, down: boolean): boolean {
  if (e.metaKey) return false // Cmd/Win keys stay with FunkyOS (Cmd+K, Cmd+W ...)
  const printable = e.key.length === 1 && !e.ctrlKey && !e.altKey
  if (printable) {
    if (down) sendText(emu, e.key)
    return true
  }
  const code = SC[e.code]
  if (!code) return false
  emu.keyboard_send_scancodes(down ? make(code) : brk(code))
  return true
}

/** Soft keys for the phone toolbar. */
export const SOFT_KEYS: { label: string; aria: string; press: (emu: V86Emu) => void }[] = [
  { label: 'Tab', aria: 'Tab', press: (e) => tap(e, SC.Tab) },
  { label: 'Esc', aria: 'Escape', press: (e) => tap(e, SC.Escape) },
  {
    label: 'Ctrl-C',
    aria: 'Control C',
    press: (e) => e.keyboard_send_scancodes([...make(SC.ControlLeft), ...make(SC.KeyC), ...brk(SC.KeyC), ...brk(SC.ControlLeft)]),
  },
  { label: '↑', aria: 'Arrow up', press: (e) => tap(e, SC.ArrowUp) },
  { label: '↓', aria: 'Arrow down', press: (e) => tap(e, SC.ArrowDown) },
]
function tap(emu: V86Emu, code: number[]) {
  emu.keyboard_send_scancodes([...make(code), ...brk(code)])
}
export const tapKey = (emu: V86Emu, name: string) => tap(emu, SC[name])
