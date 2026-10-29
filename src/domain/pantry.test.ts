import { itemsOfProduct, needsSync, onProductStateChange } from './pantry'
import { item, prod } from './testFactories'

test('running low adds the product to the list', () => {
  expect(onProductStateChange(prod({ id: 'p1', name: 'Café', state: 'ha' }), 'aAcabar', []))
    .toEqual([{ type: 'addItem', text: 'Café', productId: 'p1', reason: 'aAcabar' }])
})

test('already on the list: only the reason changes', () => {
  expect(onProductStateChange(prod({ id: 'p1', state: 'aAcabar' }), 'acabou', [item({ id: 'i1', productId: 'p1', status: 'porComprar' })]))
    .toEqual([{ type: 'setReason', itemId: 'i1', productId: 'p1', reason: 'acabou' }])
})

test('back to "há" removes the pending item', () => {
  expect(onProductStateChange(prod({ id: 'p1', state: 'acabou' }), 'ha', [item({ id: 'i1', productId: 'p1', status: 'porComprar' })]))
    .toEqual([{ type: 'removeItem', itemId: 'i1' }])
})

test('back to "há" leaves an item that is already in the cart', () => {
  expect(onProductStateChange(prod({ id: 'p1', state: 'acabou' }), 'ha', [item({ id: 'i1', productId: 'p1', status: 'carrinho' })]))
    .toEqual([])
})

test('an unlinked list item with the same name is reused, not duplicated', () => {
  expect(onProductStateChange(prod({ id: 'p1', name: 'Leite', state: 'ha' }), 'acabou', [item({ id: 'i1', text: 'leite ', status: 'porComprar' })]))
    .toEqual([{ type: 'setReason', itemId: 'i1', productId: 'p1', reason: 'acabou' }])
})

test('deleting a product takes its pending item off the list, not what is already in the cart', () => {
  expect(itemsOfProduct('p1', [
    item({ id: 'i1', productId: 'p1', status: 'porComprar' }),
    item({ id: 'i2', productId: 'p1', status: 'carrinho' }),
    item({ id: 'i3', productId: 'p2', status: 'porComprar' }),
  ]).map(i => i.id)).toEqual(['i1'])
})

test('tapping the current state again re-adds a product that was taken off the list', () => {
  const p = prod({ id: 'p1', state: 'acabou' })
  expect(needsSync(p, 'acabou', [])).toBe(true)
  expect(needsSync(p, 'acabou', [item({ productId: 'p1' })])).toBe(false)
  expect(needsSync(prod({ state: 'ha' }), 'ha', [])).toBe(false)
  expect(needsSync(p, 'ha', [])).toBe(true)
})
