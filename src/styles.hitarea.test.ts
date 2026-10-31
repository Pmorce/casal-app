// @vitest-environment node
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

/** Body of the first rule whose selector is exactly `selector`. */
function rule(selector: string): string {
  const esc = selector.replace(/\./g, '\\.')
  const m = new RegExp(`(?:^|\\n)${esc}\\s*\\{([^}]*)\\}`).exec(css)
  if (!m) throw new Error(`no rule for ${selector}`)
  return m[1]
}

test('.check keeps a hit area of at least 44×44 (inset is measured from the padding box)', () => {
  const body = rule('.check')
  const width = parseFloat(/(?:^|[\s;])width:\s*([\d.]+)px/.exec(body)![1])
  const border = parseFloat(/border:\s*([\d.]+)px/.exec(body)![1])
  const inset = parseFloat(/inset:\s*(-?[\d.]+)px/.exec(rule('.check::after'))![1])
  expect(inset).toBeLessThan(0)
  expect(width - 2 * border + 2 * Math.abs(inset)).toBeGreaterThanOrEqual(44)
})

/** Insets of `selector::after` as [top, right, bottom, left] px, CSS shorthand rules. */
function insets(selector: string): number[] {
  const v = /inset:\s*([^;]+);/.exec(rule(selector + '::after'))![1].trim().split(/\s+/).map(parseFloat)
  const [t, r = t, b = t, l = r] = v
  return [t, r, b, l]
}

const px = (body: string, prop: string) => parseFloat(new RegExp(`(?:^|[\\s;])${prop}:\\s*([\\d.]+)px`).exec(body)![1])

test.each([
  ['.btn.small', ['.btn', '.btn.small'], false],
  ['.chip', ['.chip'], false],
  ['.chips button', ['.chips button'], true],
])('%s keeps a vertical hit area of at least 44 (and 44 wide when it has a min-width)', (sel, bodies, hasMinWidth) => {
  const all = bodies.map(rule).join(';')
  const border = px(all, 'border(?:-width)?')
  const minHeight = [...bodies.map(rule)].reduce((h, b) => (/min-height:/.test(b) ? px(b, 'min-height') : h), 0)
  const [t, r, b, l] = insets(sel)
  expect(minHeight - 2 * border - t - b).toBeGreaterThanOrEqual(44)
  if (hasMinWidth) {
    const minWidth = px(rule(sel), 'min-width')
    expect(minWidth - 2 * border - l - r).toBeGreaterThanOrEqual(44)
    // neighbours sit 6px apart in .chips: the overlays must not meet
    expect(-l - r).toBeLessThan(6)
  }
})
