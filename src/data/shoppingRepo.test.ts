import { addItem, boughtOutside, finish } from './shoppingRepo'
import { item, prod } from '../domain/testFactories'

const fs = vi.hoisted(() => ({
  addDoc: vi.fn(async (_ref: unknown, _data: Record<string, unknown>) => ({ id: 'new' })),
  set: vi.fn(), update: vi.fn(), del: vi.fn(), commit: vi.fn(async () => {}),
}))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', async () => ({
  collection: vi.fn(() => 'shoppingRef'),
  doc: vi.fn((...args: unknown[]) => ({ id: String(args[2] ?? 'newId'), path: args.slice(1).join('/') })),
  addDoc: fs.addDoc,
  writeBatch: () => ({ set: fs.set, update: fs.update, delete: fs.del, commit: fs.commit }),
  deleteField: () => 'DEL',
  serverTimestamp: () => 'now',
}))

beforeEach(() => vi.clearAllMocks())

test('a duplicate (case/accents/spaces) is not written', () => {
  expect(addItem('cafe ', 'P', [], [item({ text: 'Café' })])).toBe('duplicate')
  expect(fs.addDoc).not.toHaveBeenCalled()
})

test('blank text is not written', () => {
  expect(addItem('   ', 'P', [], [])).toBe('empty')
  expect(fs.addDoc).not.toHaveBeenCalled()
})

test('adding does not wait for the server (offline in the supermarket)', () => {
  fs.addDoc.mockImplementationOnce(() => new Promise(() => {}))
  expect(addItem('Ovos', 'P', [prod({ name: 'Ovos' })], [])).toBe('added')
})

test('a new name asks for the zone first and writes nothing', () => {
  expect(addItem('Tremoços', 'P', [], [])).toBe('needsZone')
  expect(fs.addDoc).not.toHaveBeenCalled()
  expect(fs.commit).not.toHaveBeenCalled()
})

test('a known name (any case/accents) links without asking', () => {
  expect(addItem('cafe', 'P', [prod({ id: 'p1', name: 'Café' })], [])).toBe('added')
  expect(fs.addDoc).toHaveBeenCalledWith('shoppingRef', expect.objectContaining({ productId: 'p1', status: 'porComprar', addedBy: 'P' }))
})

test('choosing a zone creates the Casa product and the linked item together', () => {
  expect(addItem('Tremoços', 'P', [], [], 'despensa')).toBe('added')
  expect(fs.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: 'Tremoços', location: 'despensa' }))
  expect(fs.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ text: 'Tremoços', status: 'porComprar', productId: expect.any(String) }))
  expect(fs.commit).toHaveBeenCalledTimes(1)
})

test('"só desta vez" adds an item with no product', () => {
  addItem('Pilhas', 'P', [], [], 'oneOff')
  const data = fs.addDoc.mock.calls[0][1]
  expect(data).toMatchObject({ oneOff: true, text: 'Pilhas' })
  expect(data.productId).toBeUndefined()
})

test('finish records today as a purchase and skips deleted products', () => {
  finish([item({ id: 'i1', status: 'carrinho', productId: 'p1' }), item({ id: 'i2', status: 'carrinho', productId: 'gone' })],
    [prod({ id: 'p1', boughtKeys: ['2026-10-01'], snoozeCount: 2 })], '2026-10-29')
  expect(fs.update).toHaveBeenCalledTimes(1)
  expect(fs.update).toHaveBeenCalledWith(expect.anything(), { boughtKeys: ['2026-10-01', '2026-10-29'], snoozedUntil: 'DEL', snoozeCount: 'DEL' })
  expect(fs.del).toHaveBeenCalledTimes(2)
})

test('boughtOutside records the purchase and takes the pending item off the list', () => {
  boughtOutside(prod({ id: 'p1' }), [item({ id: 'i1', productId: 'p1', status: 'porComprar' }), item({ productId: 'p1', status: 'carrinho' })], '2026-10-29')
  expect(fs.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ boughtKeys: ['2026-10-29'] }))
  expect(fs.del).toHaveBeenCalledTimes(1)
})
