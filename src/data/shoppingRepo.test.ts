import { addItem } from './shoppingRepo'
import { item, prod } from '../domain/testFactories'

const fs = vi.hoisted(() => ({ addDoc: vi.fn(async (_ref: unknown, _data: Record<string, unknown>) => ({ id: 'new' })) }))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', async () => ({
  collection: vi.fn(() => 'shoppingRef'),
  addDoc: fs.addDoc,
  serverTimestamp: () => 'now',
}))

beforeEach(() => fs.addDoc.mockClear())

test('a duplicate (case/accents/spaces) is not written', async () => {
  expect(await addItem('cafe ', 'P', [], [item({ text: 'Café' })])).toBe('duplicate')
  expect(fs.addDoc).not.toHaveBeenCalled()
})

test('blank text is not written', async () => {
  expect(await addItem('   ', 'P', [], [])).toBe('empty')
  expect(fs.addDoc).not.toHaveBeenCalled()
})

test('adding does not wait for the server (offline in the supermarket)', () => {
  fs.addDoc.mockImplementationOnce(() => new Promise(() => {}))
  expect(addItem('Ovos', 'P', [], [])).toBe('added')
})

test('a typed name matching a Casa product is linked to it', async () => {
  expect(await addItem(' leite ', 'P', [prod({ id: 'p9', name: 'Leite' })], [])).toBe('added')
  expect(fs.addDoc).toHaveBeenCalledWith('shoppingRef', expect.objectContaining({ text: 'leite', productId: 'p9', status: 'porComprar', addedBy: 'P' }))
})

test('free text is stored without a product link', async () => {
  await addItem('Natas sem lactose ×2', 'B', [prod({ name: 'Natas sem lactose' })], [])
  const data = fs.addDoc.mock.calls[0][1]
  expect(data.productId).toBeUndefined()
  expect(data.text).toBe('Natas sem lactose ×2')
})
