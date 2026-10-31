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
