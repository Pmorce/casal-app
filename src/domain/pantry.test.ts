import { onProductStateChange } from './pantry'
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
