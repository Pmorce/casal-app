import { planMigration } from './migration'
import { item, prod } from './testFactories'

test('planMigration drops legacy fields and links handwritten items by name', () => {
  const plan = planMigration(
    [{ ...prod({ id: 'p1', name: 'Café' }), state: 'acabou' }, prod({ id: 'p2', name: 'Arroz' })],
    [{ ...item({ id: 'i1', productId: 'p1' }), reason: 'acabou' }, item({ id: 'i2', text: 'arroz ' }), item({ id: 'i3', text: 'Pilhas' })],
  )
  expect(plan).toEqual({ productIdsDropState: ['p1'], itemsDropReason: ['i1'], itemLinks: [{ itemId: 'i2', productId: 'p2' }] })
})
