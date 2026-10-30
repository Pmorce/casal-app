import { parseAmount, summary, groupBags, oldestBag, isOld, bagsOfProduct, splitAmounts, freezeDefaults, freezerInCart } from './freezer'
import { bag, item, prod } from './testFactories'

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

test('bagsOfProduct: linked bags, plus legacy bags with the same name in the same category only', () => {
  const p = prod({ id: 'p', name: 'Arroz', location: 'congelador', freezerCategory: 'outros' })
  const bags = [bag({ productId: 'p', name: 'Outro nome' }), bag({ name: ' arroz', category: 'outros' }),
    bag({ name: 'Arroz', category: 'feita' }), bag({ name: 'Arroz', category: 'outros', productId: 'x' })]
  expect(bagsOfProduct(p, bags)).toHaveLength(2)
})

test('splitAmounts keeps the total exact with 2 decimals', () => {
  expect(splitAmounts(5, 5)).toEqual([1, 1, 1, 1, 1])
  expect(splitAmounts(1, 3)).toEqual([0.33, 0.33, 0.34])
  expect(splitAmounts(2, 3)).toEqual([0.67, 0.67, 0.66])
})

test('freezeDefaults uses the last entry, else kg for meat and un. for the rest', () => {
  expect(freezeDefaults(prod({ name: 'Vaca', location: 'congelador', freezerLast: { amount: 2.5, unit: 'kg' } }))).toEqual({ amount: '2,5', unit: 'kg' })
  expect(freezeDefaults(prod({ name: 'Vaca', location: 'congelador' }))).toEqual({ amount: '', unit: 'kg' })
  expect(freezeDefaults(prod({ name: 'Gelado', location: 'congelador' }))).toEqual({ amount: '', unit: 'un' })
})

test('freezerInCart lists Congelador products in the cart, once', () => {
  const products = [prod({ id: 'c', location: 'congelador' }), prod({ id: 'd', location: 'despensa' })]
  const items = [item({ status: 'carrinho', productId: 'c' }), item({ status: 'carrinho', productId: 'd' }), item({ status: 'porComprar', productId: 'c' }), item({ status: 'carrinho', productId: 'c' })]
  expect(freezerInCart(items, products).map(p => p.id)).toEqual(['c'])
})
