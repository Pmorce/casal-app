import { checkRename, itemsOfProduct } from './pantry'
import { item, prod } from './testFactories'

test('deleting a product takes its pending item off the list, not what is already in the cart', () => {
  expect(itemsOfProduct('p1', [
    item({ id: 'i1', productId: 'p1', status: 'porComprar' }),
    item({ id: 'i2', productId: 'p1', status: 'carrinho' }),
    item({ id: 'i3', productId: 'p2', status: 'porComprar' }),
  ]).map(i => i.id)).toEqual(['i1'])
})

test('renaming checks for blanks and for another product with the same name', () => {
  const leite = prod({ id: 'p1', name: 'Leite' })
  const all = [leite, prod({ id: 'p2', name: 'Café' })]
  expect(checkRename(leite, '  Leite  meio-gordo ', all)).toEqual({ ok: 'Leite meio-gordo' })
  expect(checkRename(leite, 'cafe', all)).toEqual({ error: 'Já existe «Café»' })
  expect(checkRename(leite, '  ', all)).toEqual({ error: 'Falta o nome' })
  expect(checkRename(leite, 'LEITE', all)).toEqual({ ok: 'LEITE' })
})
