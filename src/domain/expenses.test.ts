import { parseEuros, formatEuros, monthTotals } from './expenses'
import { exp } from './testFactories'

test('parseEuros accepts comma or dot, rejects negative/blank', () => {
  expect(parseEuros('12,50')).toBe(1250)
  expect(parseEuros('97')).toBe(9700)
  expect(parseEuros('12.5')).toBe(1250)
  expect(parseEuros('-3')).toBeNull()
  expect(parseEuros('')).toBeNull()
  expect(parseEuros('abc')).toBeNull()
})

test('formatEuros', () => {
  expect(formatEuros(19400).replace(/\s/g, ' ')).toBe('194,00 €')
})

test('monthTotals sums by person within the month only', () => {
  expect(monthTotals([
    exp({ uid: 'b', cents: 9700, dateKey: '2026-08-03' }),
    exp({ uid: 'b', cents: 6200, dateKey: '2026-08-15' }),
    exp({ uid: 'p', cents: 4000, dateKey: '2026-08-20' }),
    exp({ uid: 'p', cents: 1, dateKey: '2026-09-01' }),
  ], 2026, 8)).toEqual({ byUid: { b: 15900, p: 4000 }, total: 19900 })
})

test('parseEuros accepts ",5" as 50 cents but not a lone comma', () => {
  expect(parseEuros(',5')).toBe(50)
  expect(parseEuros('.75')).toBe(75)
  expect(parseEuros(',')).toBeNull()
})
