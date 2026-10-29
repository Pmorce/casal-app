import { parseAmount, summary, groupBags, oldestBag, isOld } from './freezer'
import { bag } from './testFactories'

const group = (bags: ReturnType<typeof bag>[]) => groupBags(bags)[0]

test('parseAmount accepts PT decimal comma and rejects junk', () => {
  expect(parseAmount('2,5')).toBe(2.5)
  expect(parseAmount('3')).toBe(3)
  expect(parseAmount('abc')).toBeNull()
  expect(parseAmount('0')).toBeNull()
  expect(parseAmount('')).toBeNull()
  expect(parseAmount('-1')).toBeNull()
})

describe('summary', () => {
  test('counts bags and sums units', () => {
    expect(summary(group(Array.from({ length: 4 }, () => bag({ amount: 2, unit: 'un' }))))).toBe('4 sacos · 8 un.')
  })
  test('g and kg merge, shown in kg from 1000 g', () => {
    expect(summary(group([bag({ amount: 500, unit: 'g' }), bag({ amount: 0.5, unit: 'kg' })]))).toBe('2 sacos · 1 kg')
    expect(summary(group([bag({ amount: 600, unit: 'g' })]))).toBe('1 saco · 600 g')
  })
  test('mixed units are listed separately', () => {
    expect(summary(group([bag({ amount: 2, unit: 'un' }), bag({ amount: 2, unit: 'un' }), bag({ amount: 500, unit: 'g' })]))).toBe('3 sacos · 4 un. + 500 g')
  })
  test('doses and decimal comma output', () => {
    expect(summary(group([bag({ amount: 3, unit: 'doses' })]))).toBe('1 saco · 3 doses')
    expect(summary(group([bag({ amount: 2.5, unit: 'kg' })]))).toBe('1 saco · 2,5 kg')
  })
})

test('oldestBag picks the earliest entry', () => {
  const g = group([bag({ addedKey: '2026-08-01' }), bag({ addedKey: '2026-06-01' }), bag({ addedKey: '2026-09-01' })])
  expect(oldestBag(g).addedKey).toBe('2026-06-01')
})

test('isOld after more than 90 days', () => {
  expect(isOld(bag({ addedKey: '2026-07-01' }), '2026-10-01')).toBe(true)
  expect(isOld(bag({ addedKey: '2026-07-03' }), '2026-10-01')).toBe(false)
})

test('groupBags merges names ignoring case/spaces but keeps categories apart', () => {
  expect(groupBags([bag({ name: 'Bifes de frango', category: 'carne' }), bag({ name: 'bifes de frango ', category: 'carne' })])).toHaveLength(1)
  expect(groupBags([bag({ name: 'Arroz', category: 'carne' }), bag({ name: 'Arroz', category: 'feita' })])).toHaveLength(2)
})
