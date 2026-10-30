import { describe, expect, it } from 'vitest'
import { bag, item, prod } from './testFactories'
import { tidyPlan, type TidyPlan } from './tidy'
import type { FreezerBag, Product, ShoppingItem } from './types'

function apply(plan: TidyPlan, products: Product[], items: ShoppingItem[], bags: FreezerBag[]) {
  const patch = <T extends { id: string }, D>(list: T[], changes: { id: string; data: D }[], del: string[] = []) =>
    list.filter((x) => !del.includes(x.id)).map((x) => ({ ...x, ...changes.find((c) => c.id === x.id)?.data }))
  return {
    products: patch(products, plan.products, plan.deleteProducts),
    items: patch(items, plan.items, plan.deleteItems),
    bags: patch(bags, plan.bags),
  }
}

const mergeFixture = () => ({
  products: [
    prod({ id: 'a', name: 'leite', boughtKeys: ['2026-10-01'] }),
    prod({ id: 'b', name: 'Leite', location: 'frigorifico', boughtKeys: ['2026-10-05', '2026-10-20'] }),
  ],
  items: [item({ id: 'i1', text: 'leite', productId: 'a' })],
  bags: [bag({ id: 'g1', name: 'leite', productId: 'a' })],
})

describe('tidyPlan', () => {
  it('clean data gives an empty plan', () => {
    const p = prod({ id: 'p1', name: 'Leite' })
    const plan = tidyPlan([p], [item({ id: 'i1', text: 'Leite', productId: 'p1' })], [bag({ id: 'g1', name: 'Leite', productId: 'p1' })])
    expect(plan.isEmpty).toBe(true)
    expect([plan.products, plan.deleteProducts, plan.items, plan.deleteItems, plan.bags]).toEqual([[], [], [], [], []])
  })

  it('two products with the same name merge into the one with more purchases', () => {
    const f = mergeFixture()
    const plan = tidyPlan(f.products, f.items, f.bags)
    expect(plan.deleteProducts).toEqual(['a'])
    expect(plan.products).toEqual([{ id: 'b', data: { boughtKeys: ['2026-10-01', '2026-10-05', '2026-10-20'] } }])
    expect(plan.items).toEqual([{ id: 'i1', data: { productId: 'b', text: 'Leite' } }])
    expect(plan.bags).toEqual([{ id: 'g1', data: { productId: 'b', name: 'Leite' } }])
    expect(plan.isEmpty).toBe(false)
  })

  it('tie on purchases keeps the smallest id', () => {
    const plan = tidyPlan([prod({ id: 'z', name: 'Pão' }), prod({ id: 'm', name: 'pao' })], [], [])
    expect(plan.deleteProducts).toEqual(['z'])
    expect(plan.products).toEqual([])
  })

  it('merged purchases keep only the last 8 days', () => {
    const d = (n: number) => `2026-10-${String(n).padStart(2, '0')}`
    const a = prod({ id: 'a', name: 'x', boughtKeys: [d(1), d(2), d(3), d(4), d(5)] })
    const b = prod({ id: 'b', name: 'X', boughtKeys: [d(6), d(7), d(8), d(9)] })
    const plan = tidyPlan([a, b], [], [])
    expect(plan.deleteProducts).toEqual(['b'])
    expect(plan.products).toEqual([{ id: 'a', data: { boughtKeys: [d(2), d(3), d(4), d(5), d(6), d(7), d(8), d(9)] } }])
  })

  it('freezerLast and freezerCategory come from the other product when the kept one has none', () => {
    const a = prod({ id: 'a', name: 'Bife', boughtKeys: ['2026-10-01', '2026-10-02'] })
    const b = prod({ id: 'b', name: 'bife', freezerLast: { amount: 2, unit: 'un' }, freezerCategory: 'carne' })
    const plan = tidyPlan([a, b], [], [])
    expect(plan.products).toEqual([{ id: 'a', data: { freezerLast: { amount: 2, unit: 'un' }, freezerCategory: 'carne' } }])
  })

  it('the kept product keeps its own freezerLast', () => {
    const a = prod({ id: 'a', name: 'Bife', freezerLast: { amount: 1, unit: 'kg' }, boughtKeys: ['2026-10-01', '2026-10-02'] })
    const b = prod({ id: 'b', name: 'bife', freezerLast: { amount: 2, unit: 'un' } })
    const plan = tidyPlan([a, b], [], [])
    expect(plan.deleteProducts).toEqual(['b'])
    expect(plan.products.every(p => !('freezerLast' in p.data))).toBe(true)
  })

  it('a linked item and bag with an old name get the product name', () => {
    const plan = tidyPlan([prod({ id: 'p', name: 'Leite' })], [item({ id: 'i', text: 'leit', productId: 'p' })], [bag({ id: 'g', name: 'leit', productId: 'p' })])
    expect(plan.items).toEqual([{ id: 'i', data: { text: 'Leite' } }])
    expect(plan.bags).toEqual([{ id: 'g', data: { name: 'Leite' } }])
  })

  it('unlinked or orphan ones are left alone', () => {
    const plan = tidyPlan(
      [prod({ id: 'p', name: 'Leite' })],
      [item({ id: 'i1', text: 'outra' }), item({ id: 'i2', text: 'velho', productId: 'gone' })],
      [bag({ id: 'g1', name: 'x' }), bag({ id: 'g2', name: 'y', productId: 'gone' })],
    )
    expect(plan.isEmpty).toBe(true)
  })

  it('the same product twice on the list keeps one; a cart one wins', () => {
    const p = prod({ id: 'p1', name: 'Leite' })
    const i2 = item({ id: 'i2', text: 'Leite', productId: 'p1' })
    const i1 = item({ id: 'i1', text: 'Leite', productId: 'p1' })
    expect(tidyPlan([p], [i2, i1], []).deleteItems).toEqual(['i2'])
    const i3 = item({ id: 'i3', text: 'Leite', productId: 'p1', status: 'carrinho' })
    expect([...tidyPlan([p], [i2, i1, i3], []).deleteItems].sort()).toEqual(['i1', 'i2'])
  })

  it('after a merge the two list items of the two products become one', () => {
    const f = mergeFixture()
    const items = [item({ id: 'i1', text: 'leite', productId: 'a' }), item({ id: 'i2', text: 'Leite', productId: 'b' })]
    const plan = tidyPlan(f.products, items, [])
    expect(plan.deleteItems).toEqual(['i2'])
    expect(plan.items).toEqual([{ id: 'i1', data: { productId: 'b', text: 'Leite' } }])
  })

  it('two loose items with the same text keep one', () => {
    const plan = tidyPlan([], [item({ id: 'i2', text: 'Pilhas' }), item({ id: 'i1', text: ' pilhas ' })], [])
    expect(plan.deleteItems).toEqual(['i2'])
    expect(plan.items).toEqual([])
  })

  it('applying the plan and planning again gives an empty plan', () => {
    const f = mergeFixture()
    const items = [...f.items, item({ id: 'i2', text: 'Leite', productId: 'b' })]
    const plan = tidyPlan(f.products, items, f.bags)
    const after = apply(plan, f.products, items, f.bags)
    expect(tidyPlan(after.products, after.items, after.bags).isEmpty).toBe(true)
  })
})
