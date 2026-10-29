import { normalize, isOnList, cleanText, findProduct, finishShopping } from './shopping'
import { item, prod } from './testFactories'

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
  ], [prod({ id: 'p1' }), prod({ id: 'p2' })])).toEqual({ deleteIds: ['a', 'b'], productIdsToHa: ['p1'] })
})

test('finishShopping skips products that no longer exist', () => {
  expect(finishShopping([item({ id: 'a', status: 'carrinho', productId: 'gone' }), item({ id: 'b', status: 'carrinho', productId: 'p1' })], [prod({ id: 'p1' })]))
    .toEqual({ deleteIds: ['a', 'b'], productIdsToHa: ['p1'] })
})
