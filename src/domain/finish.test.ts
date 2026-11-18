import { backToCasa, needsStoreQuestion, planFinish } from './finish'
import { item, part, prod } from './testFactories'
import type { Trip } from './types'

const today = '2026-11-18'
const trip: Trip = { id: 'trip', store: 'Continente', stores: ['Lidl', 'Continente'], startedBy: 'P', dateKey: today }
const ctx = (over: Partial<Parameters<typeof planFinish>[2]> = {}) => ({ trip: null, asked: null, uid: 'P', today, ...over })

test('a trip Lidl → Continente gives one "Quanto foi?" per store, in trip order; untagged ticks take the current store', () => {
  const items = [
    item({ id: 'c', text: 'Café', status: 'carrinho', store: 'Continente' }),
    item({ id: 'l', text: 'Leite', status: 'carrinho', store: 'Lidl' }),
    item({ id: 'o', text: 'Ovos', status: 'carrinho' }),
    item({ id: 'x', text: 'Pão', status: 'porComprar' }),
  ]
  const plan = planFinish(items, [], ctx({ trip }))
  expect(plan.stores).toEqual(['Lidl', 'Continente'])
  expect(plan.deleteIds).toEqual(['c', 'l', 'o'])
  expect(plan.purchases.find(p => p.key === 'o')!.row.store).toBe('Continente')
  expect(plan.purchases.find(p => p.key === 'l')!.row).toEqual({ name: 'Leite', store: 'Lidl', dateKey: today, by: 'P' })
})

test('no trip and no answer: one "Quanto foi?" without store, and the rows have no store field', () => {
  const plan = planFinish([item({ status: 'carrinho' }), item({ status: 'carrinho' })], [], ctx())
  expect(plan.stores).toEqual([null])
  plan.purchases.forEach(p => expect(p.row).not.toHaveProperty('store'))
})

test('the answer to "Onde foi?" fills the untagged rows', () => {
  const plan = planFinish([item({ status: 'carrinho' }), item({ status: 'carrinho', store: 'Lidl' })], [], ctx({ asked: 'Aldi' }))
  expect(plan.stores).toEqual(['Aldi', 'Lidl'])
})

test('a store left on a tick after leaving the trip still gets its own card, plus one without store', () => {
  const plan = planFinish([item({ status: 'carrinho', store: 'Lidl' }), item({ status: 'carrinho' })], [], ctx())
  expect(plan.stores).toEqual(['Lidl', null])
})

test('needsStoreQuestion: only without a trip and with something in the cart without store', () => {
  const untagged = [item({ status: 'carrinho' })]
  expect(needsStoreQuestion(untagged, null)).toBe(true)
  expect(needsStoreQuestion(untagged, trip)).toBe(false)
  expect(needsStoreQuestion([item({ status: 'carrinho', store: 'Lidl' }), item({ status: 'porComprar' })], null)).toBe(false)
  expect(needsStoreQuestion([item({ status: 'carrinho', parts: [part({ store: 'Lidl' }), part()] })], null)).toBe(true)
  expect(needsStoreQuestion([item({ status: 'carrinho', parts: [part({ store: 'Lidl' })] })], null)).toBe(false)
})

const meat = (p: Parameters<typeof prod>[0]) => prod({ location: 'congelador', freezerCategory: 'carne', ...p })

test('"Carne" with parts Vaca and Vazia: a row per part with amounts, Carne turns generic and is not recorded', () => {
  const carne = meat({ id: 'carne', name: 'Carne' })
  const vaca = meat({ id: 'vaca', name: 'Vaca' })
  const vazia = meat({ id: 'vazia', name: 'Vazia' })
  const items = [item({ id: 'i', text: 'Carne', productId: 'carne', status: 'carrinho', parts: [
    part({ id: 'a', productId: 'vaca', name: 'Vaca', amount: 3, unit: 'kg', store: 'Lidl' }),
    part({ id: 'b', productId: 'vazia', name: 'Vazia', amount: 1, unit: 'kg', store: 'Lidl' }),
  ] })]
  const plan = planFinish(items, [carne, vaca, vazia], ctx())
  expect(plan.purchases).toEqual([
    { key: 'a', row: { name: 'Vaca', productId: 'vaca', store: 'Lidl', dateKey: today, by: 'P', amount: 3, unit: 'kg' } },
    { key: 'b', row: { name: 'Vazia', productId: 'vazia', store: 'Lidl', dateKey: today, by: 'P', amount: 1, unit: 'kg' } },
  ])
  expect(plan.makeGeneric).toEqual(['carne'])
  expect(plan.boughtIds).toEqual(['vaca', 'vazia'])
  expect(plan.freezer).toEqual([
    { key: 'a', productId: 'vaca', amount: 3, unit: 'kg' },
    { key: 'b', productId: 'vazia', amount: 1, unit: 'kg' },
  ])
  expect(plan.deleteIds).toEqual(['i'])
})

test('"Frango" with parts Frango and Peru stays a real product', () => {
  const frango = meat({ id: 'frango', name: 'Frango' })
  const peru = meat({ id: 'peru', name: 'Peru' })
  const items = [item({ productId: 'frango', status: 'carrinho', parts: [
    part({ productId: 'frango', name: 'Frango' }), part({ productId: 'peru', name: 'Peru' }),
  ] })]
  const plan = planFinish(items, [frango, peru], ctx())
  expect(plan.makeGeneric).toEqual([])
  expect(plan.boughtIds).toEqual(['frango', 'peru'])
})

test('a product already generic is not made generic again (undo must not clear it)', () => {
  const carne = meat({ id: 'carne', name: 'Carne', generic: true })
  const vaca = meat({ id: 'vaca', name: 'Vaca' })
  const plan = planFinish([item({ productId: 'carne', status: 'carrinho', parts: [part({ productId: 'vaca', name: 'Vaca' })] })], [carne, vaca], ctx())
  expect(plan.makeGeneric).toEqual([])
})

test('a part whose product was deleted keeps its name, without productId or freezer row', () => {
  const carne = meat({ id: 'carne', name: 'Carne' })
  const plan = planFinish([item({ productId: 'carne', status: 'carrinho', parts: [part({ id: 'a', productId: 'gone', name: 'Vaca', amount: 2, unit: 'kg' })] })], [carne], ctx())
  expect(plan.purchases[0].row).toEqual({ name: 'Vaca', dateKey: today, by: 'P', amount: 2, unit: 'kg' })
  expect(plan.freezer).toEqual([])
  expect(plan.boughtIds).toEqual([])
})

test('a part whose product was re-created is found by name', () => {
  const vaca = meat({ id: 'nova', name: 'Vaca' })
  const plan = planFinish([item({ status: 'carrinho', parts: [part({ productId: 'gone', name: 'vaca' })] })], [vaca], ctx())
  expect(plan.purchases[0].row.productId).toBe('nova')
  expect(plan.boughtIds).toEqual(['nova'])
})

test('plain items: linked ones are recorded; "só desta vez" and deleted ones get the name only; congelador products once each', () => {
  const leite = prod({ id: 'leite', name: 'Leite' })
  const gelado = prod({ id: 'gel', name: 'Gelado', location: 'congelador' })
  const items = [
    item({ id: '1', text: 'Leite', productId: 'leite', status: 'carrinho' }),
    item({ id: '2', text: 'Pilhas', oneOff: true, status: 'carrinho' }),
    item({ id: '3', text: 'Velho', productId: 'gone', status: 'carrinho' }),
    item({ id: '4', text: 'Gelado', productId: 'gel', status: 'carrinho' }),
    item({ id: '5', text: 'Gelado', productId: 'gel', status: 'carrinho' }),
  ]
  const plan = planFinish(items, [leite, gelado], ctx())
  expect(plan.purchases.map(p => p.row)).toEqual([
    { name: 'Leite', productId: 'leite', dateKey: today, by: 'P' },
    { name: 'Pilhas', dateKey: today, by: 'P' },
    { name: 'Velho', dateKey: today, by: 'P' },
    { name: 'Gelado', productId: 'gel', dateKey: today, by: 'P' },
    { name: 'Gelado', productId: 'gel', dateKey: today, by: 'P' },
  ])
  expect(plan.boughtIds).toEqual(['leite', 'gel'])
  expect(plan.freezer).toEqual([{ key: '4', productId: 'gel' }])
})

test('backToCasa names only cart items linked to a product that still exists', () => {
  expect(backToCasa([
    item({ text: 'Café', status: 'carrinho', productId: 'gone' }),
    item({ text: 'Leite', status: 'carrinho', productId: 'p1' }),
    item({ text: 'Natas', status: 'carrinho' }),
    item({ text: 'Ovos', status: 'porComprar', productId: 'p2' }),
  ], [prod({ id: 'p1', name: 'Leite' }), prod({ id: 'p2', name: 'Ovos' })])).toEqual(['Leite'])
})

test('backToCasa names the meat types recorded, not the "Carne" that turns generic', () => {
  const products = [meat({ id: 'carne', name: 'Carne' }), meat({ id: 'vaca', name: 'Vaca' }), meat({ id: 'vazia', name: 'Vazia' })]
  const items = [item({ productId: 'carne', status: 'carrinho', parts: [
    part({ productId: 'vazia', name: 'Vazia' }), part({ productId: 'vaca', name: 'Vaca' }),
  ] })]
  expect(backToCasa(items, products)).toEqual(['Vaca', 'Vazia'])
})

test('backToCasa does not name a product that is already generic', () => {
  const products = [meat({ id: 'carne', name: 'Carne', generic: true }), prod({ id: 'l', name: 'Leite' })]
  expect(backToCasa([item({ productId: 'carne', status: 'carrinho' }), item({ productId: 'l', status: 'carrinho' })], products)).toEqual(['Leite'])
})
