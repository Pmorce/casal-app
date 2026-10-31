// @vitest-environment node
import { readFileSync } from 'node:fs'

// read from disk: Vitest blanks CSS imports, even with ?raw
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

/** The custom properties of the first `:root { … }` block in `source`. */
function tokens(source: string): Record<string, string> {
  const block = /:root\s*\{([^}]*)\}/.exec(source)?.[1] ?? ''
  return Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))
}

const light = tokens(css)
const dark = tokens(/@media \(prefers-color-scheme: dark\)\s*\{([\s\S]*?\})\s*\}/.exec(css)?.[1] ?? '')

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`)
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe.each([['light', light], ['dark', dark]] as const)('%s theme', (_, t) => {
  test.each(['--text', '--muted', '--accent-ink'])('%s reads on bg, card and wash', fg => {
    for (const bg of ['--bg', '--card', '--wash']) expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
  })

  test('accent-ink reads on accent-soft (chips, the active segment)', () => {
    expect(contrast(t['--accent-ink'], t['--accent-soft'])).toBeGreaterThanOrEqual(4.5)
  })

  test('warnings and errors read on their backgrounds', () => {
    for (const bg of ['--bg', '--warn-soft']) expect(contrast(t['--warn'], t[bg]), `--warn on ${bg}`).toBeGreaterThanOrEqual(4.5)
    for (const bg of ['--bg', '--card', '--danger-soft']) expect(contrast(t['--danger'], t[bg]), `--danger on ${bg}`).toBeGreaterThanOrEqual(4.5)
  })

  test('the header subtitle reads on every colour of the header', () => {
    const stops = t['--hero'].match(/#[0-9a-f]{6}/gi) ?? []
    expect(stops).toHaveLength(3)
    for (const stop of stops) expect(contrast(t['--hero-muted'], stop), stop).toBeGreaterThanOrEqual(4.5)
  })

  test('the Hoje tiles read on their tones (pêssego text is --warn)', () => {
    expect(contrast(t['--warn'], t['--pessego-bg'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t['--ceu'], t['--ceu-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  test('the undo toast action reads on the toast (--text background)', () => {
    expect(contrast(t['--accent-inverse'], t['--text'])).toBeGreaterThanOrEqual(4.5)
  })

  test('the undo toast message reads on the toast (--bg on --text)', () => {
    expect(contrast(t['--bg'], t['--text'])).toBeGreaterThanOrEqual(4.5)
  })
})

test('white reads on the filled primary button in light mode', () => {
  expect(contrast('#ffffff', light['--accent-strong'])).toBeGreaterThanOrEqual(4.5)
})

test('the background colour reads on the filled primary button in dark mode', () => {
  expect(contrast(dark['--bg'], dark['--accent-strong'])).toBeGreaterThanOrEqual(4.5)
})
