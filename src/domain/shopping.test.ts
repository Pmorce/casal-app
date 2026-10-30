import { normalize, isOnList, cleanText, findProduct, finishShopping, backToCasa, maybeMissing } from './shopping'
import { bag, item, prod } from './testFactories'

test('normalize strips accents, case and extra spaces', () => {
  expect(normalize('  Café  ')).toBe('cafe')
  expect(normalize('Natas  SEM lactose')).toBe('natas sem lactose')
})

test('isOnList treats case/accents/spaces as the same item', () => {
  expect(isOnList('cafe ', [item({ text: 'Café', status: 'porComprar' })])).toBe(true)
  expect(isOnList('Leite', [item({ text: 'Café' })])).toBe(false)
})

test('cleanText rejects blank input and collapses spaces', () => {
  expect(cleanText('   ')).toBeNull()
  expect(cleanText('  Pão   de forma ')).toBe('Pão de forma')
})

test('findProduct matches only exact normalized names', () => {
  expect(findProduct('LEITE', [prod({ name: 'Leite' })])?.name).toBe('Leite')
  expect(findProduct('Natas sem lactose ×2', [prod({ name: 'Natas sem lactose' })])).toBeUndefined()
})

test('finishShopping removes cart items and restores linked products only', () => {
  expect(finishShopping([
    item({ id: 'a', status: 'carrinho', productId: 'p1' }),
    item({ id: 'b', status: 'carrinho' }),
    item({ id: 'c', status: 'porComprar', productId: 'p2' }),
  ], [prod({ id: 'p1' }), prod({ id: 'p2' })])).toEqual({ deleteIds: ['a', 'b'], productIdsBought: ['p1'] })
})

test('finishShopping skips products that no longer exist', () => {
  expect(finishShopping([item({ id: 'a', status: 'carrinho', productId: 'gone' }), item({ id: 'b', status: 'carrinho', productId: 'p1' })], [prod({ id: 'p1' })]))
    .toEqual({ deleteIds: ['a', 'b'], productIdsBought: ['p1'] })
})

test('backToCasa names only cart items linked to a product that still exists', () => {
  expect(backToCasa([
    item({ text: 'Café', status: 'carrinho', productId: 'gone' }),
    item({ text: 'Leite', status: 'carrinho', productId: 'p1' }),
    item({ text: 'Natas', status: 'carrinho' }),
    item({ text: 'Ovos', status: 'porComprar', productId: 'p2' }),
  ], [prod({ id: 'p1' }), prod({ id: 'p2' })])).toEqual(['Leite'])
})

test('maybeMissing lists due products not already on the list, most overdue first', () => {
  const rhythm = (last: string) => ({ boughtKeys: ['2026-09-01', '2026-09-11', last] })
  const cafe = prod({ id: 'c', ...rhythm('2026-09-21') })
  const leite = prod({ id: 'l', ...rhythm('2026-09-21') })
  const arroz = prod({ id: 'a', boughtKeys: ['2026-08-01', '2026-08-11', '2026-08-21'] })
  const r = maybeMissing([cafe, leite, arroz], [item({ productId: 'l', status: 'carrinho' })], '2026-10-05')
  expect(r.map(x => x.product.id)).toEqual(['a', 'c'])
  expect(r[1]).toMatchObject({ gap: 10, since: 14 })
})

test('maybeMissing lists Congelador products without bags first, never by rhythm', () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador', boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'] })
  const c = prod({ id: 'c', name: 'Café', boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'] })
  expect(maybeMissing([c, v], [], '2026-10-29', []).map(m => [m.product.id, m.reason])).toEqual([['v', 'congelador'], ['c', 'ritmo']])
  expect(maybeMissing([v], [], '2026-10-29', [bag({ productId: 'v' })])).toEqual([])
})
