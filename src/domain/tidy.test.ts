import { describe, expect, it } from 'vitest'
import { bag, item, part, prod } from './testFactories'
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

  it('generic comes from the other product when the kept one is not marked', () => {
    const a = prod({ id: 'a', name: 'Carne', boughtKeys: ['2026-10-01', '2026-10-02'] })
    const b = prod({ id: 'b', name: 'carne', generic: true })
    const plan = tidyPlan([a, b], [], [])
    expect(plan.deleteProducts).toEqual(['b'])
    expect(plan.products).toEqual([{ id: 'a', data: { generic: true } }])
  })

  it('the parts of a dropped copy move to the kept one, which goes to the cart', () => {
    const p = prod({ id: 'c', name: 'Carne', generic: true })
    const i1 = item({ id: 'i1', text: 'Carne', productId: 'c' })
    const i2 = item({ id: 'i2', text: 'Carne', productId: 'c', parts: [part({ id: 'pa', name: 'Bifes' })] })
    const plan = tidyPlan([p], [i1, i2], [])
    // neither is in the cart, so the smallest id is kept and takes the parts
    expect(plan.deleteItems).toEqual(['i2'])
    expect(plan.items).toEqual([{ id: 'i1', data: { parts: [part({ id: 'pa', name: 'Bifes' })], status: 'carrinho' } }])
  })

  it('parts are concatenated without repeating an id', () => {
    const p = prod({ id: 'c', name: 'Carne', generic: true })
    const pa = part({ id: 'pa', name: 'Bifes' })
    const pb = part({ id: 'pb', name: 'Costeletas' })
    const pc = part({ id: 'pc', name: 'Entrecosto' })
    const i1 = item({ id: 'i1', text: 'Carne', productId: 'c', status: 'carrinho', parts: [pa] })
    const i2 = item({ id: 'i2', text: 'Carne', productId: 'c', status: 'carrinho', parts: [pa, pc] })
    const i3 = item({ id: 'i3', text: 'Carne', productId: 'c', parts: [pb] })
    const plan = tidyPlan([p], [i3, i2, i1], [])
    expect([...plan.deleteItems].sort()).toEqual(['i2', 'i3'])
    expect(plan.items).toEqual([{ id: 'i1', data: { parts: [pa, pc, pb] } }])
  })

  it('a loose kept item also gets the parts of its dropped copy', () => {
    const pa = part({ id: 'pa' })
    const plan = tidyPlan([], [item({ id: 'i1', text: 'Peixe' }), item({ id: 'i2', text: 'peixe', parts: [pa] })], [])
    expect(plan.deleteItems).toEqual(['i2'])
    expect(plan.items).toEqual([{ id: 'i1', data: { parts: [pa], status: 'carrinho' } }])
  })

  it('dropped copies without parts change nothing on the kept one', () => {
    const p = prod({ id: 'c', name: 'Carne' })
    const plan = tidyPlan([p], [item({ id: 'i1', text: 'Carne', productId: 'c' }), item({ id: 'i2', text: 'Carne', productId: 'c' })], [])
    expect(plan.items).toEqual([])
  })

  it('merged parts and generic converge: planning again on the result is empty', () => {
    const f = mergeFixture()
    const products = [...f.products, prod({ id: 'm1', name: 'Carne', boughtKeys: ['2026-10-01'] }), prod({ id: 'm2', name: 'carne', generic: true })]
    const items = [
      ...f.items,
      item({ id: 'i2', text: 'Leite', productId: 'b' }),
      item({ id: 'k1', text: 'carne', productId: 'm2', parts: [part({ id: 'pa' })] }),
      item({ id: 'k2', text: 'Carne', productId: 'm1', status: 'carrinho', parts: [part({ id: 'pb' })] }),
      item({ id: 'k3', text: 'Carne', productId: 'm1', parts: [part({ id: 'pb' }), part({ id: 'pc' })] }),
    ]
    const plan = tidyPlan(products, items, f.bags)
    const after = apply(plan, products, items, f.bags)
    expect(after.items.find(i => i.id === 'k2')?.parts?.map(x => x.id)).toEqual(['pb', 'pa', 'pc'])
    expect(after.products.find(x => x.id === 'm1')?.generic).toBe(true)
    expect(tidyPlan(after.products, after.items, after.bags).isEmpty).toBe(true)
  })

  it('applying the plan and planning again gives an empty plan', () => {
    const f = mergeFixture()
    const items = [...f.items, item({ id: 'i2', text: 'Leite', productId: 'b' })]
    const plan = tidyPlan(f.products, items, f.bags)
    const after = apply(plan, f.products, items, f.bags)
    expect(tidyPlan(after.products, after.items, after.bags).isEmpty).toBe(true)
  })
})
