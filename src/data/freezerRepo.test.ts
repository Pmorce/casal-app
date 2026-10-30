import { addBags, addSameAsLast, deleteBags, freezeBought, removeOldest, splitBag, undoFreeze } from './freezerRepo'
import { groupBags } from '../domain/freezer'
import { bag, prod } from '../domain/testFactories'

const fs = vi.hoisted(() => ({
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async (_ref: unknown, _data: unknown) => {}),
  n: 0,
}))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', async () => ({
  collection: vi.fn(() => 'bagsRef'),
  doc: vi.fn((...args: unknown[]) => ({ id: String(args[2] ?? `new${++fs.n}`), path: args.slice(1).join('/') || 'new' })),
  writeBatch: () => ({ set: fs.set, update: fs.update, delete: fs.delete, commit: fs.commit }),
  deleteField: () => 'DEL',
  deleteDoc: fs.deleteDoc,
  updateDoc: fs.updateDoc,
  serverTimestamp: () => 'now',
}))

beforeEach(() => vi.clearAllMocks())

test('addBags writes one document per bag with today as entry date', async () => {
  await addBags({ name: ' Bifes de frango ', category: 'carne', amount: 2, unit: 'un', count: 4 }, '2026-10-29')
  expect(fs.set).toHaveBeenCalledTimes(4)
  expect(fs.set.mock.calls[0][1]).toEqual(expect.objectContaining({ name: 'Bifes de frango', amount: 2, unit: 'un', category: 'carne', addedKey: '2026-10-29' }))
  expect(fs.commit).toHaveBeenCalledTimes(1)
})

test('addBags rejects a blank name or a count outside 1–20', async () => {
  expect(() => addBags({ name: ' ', category: 'carne', amount: 2, unit: 'un', count: 1 }, '2026-10-29')).toThrow()
  expect(() => addBags({ name: 'X', category: 'carne', amount: 2, unit: 'un', count: 21 }, '2026-10-29')).toThrow()
  expect(fs.set).not.toHaveBeenCalled()
})

test('freezer writes do not wait for the server', () => {
  fs.commit.mockImplementationOnce(() => new Promise(() => {}))
  expect(addBags({ name: 'X', category: 'carne', amount: 1, unit: 'un', count: 1 }, '2026-10-29')).toBeUndefined()
  fs.deleteDoc.mockImplementationOnce(() => new Promise(() => {}))
  const g = groupBags([bag({ id: 'b1' })])[0]
  expect(removeOldest(g).id).toBe('b1')
})

test('removeOldest deletes the oldest bag of the group and returns it for undo', async () => {
  const g = groupBags([bag({ id: 'new', addedKey: '2026-10-01' }), bag({ id: 'old', addedKey: '2026-05-01' })])[0]
  const removed = await removeOldest(g)
  expect(removed.id).toBe('old')
  expect(fs.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'freezerBags/old' }))
})

test('freezeBought: one bag per product, linked, in one batch; freezerLast updated outside it', () => {
  const p = prod({ id: 'v', name: 'Carne de vaca', location: 'congelador' })
  const { bagIds } = freezeBought([{ product: p, amount: 5, unit: 'kg' }], '2026-10-30')
  expect(bagIds).toHaveLength(1)
  expect(fs.set.mock.calls[0][1]).toEqual(expect.objectContaining({ name: 'Carne de vaca', category: 'carne', productId: 'v', amount: 5, unit: 'kg', addedKey: '2026-10-30' }))
  expect(fs.commit).toHaveBeenCalledTimes(1)
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'products/v' }), { freezerLast: { amount: 5, unit: 'kg', key: '2026-10-30' } })
})

test('freezeBought still creates the bags when the product update fails (product deleted meanwhile)', () => {
  fs.updateDoc.mockRejectedValueOnce(new Error('not-found'))
  freezeBought([{ product: prod({ id: 'gone', name: 'Gelado', location: 'congelador' }), amount: 1, unit: 'un' }], '2026-10-30')
  expect(fs.set).toHaveBeenCalledTimes(1)
  expect(fs.set.mock.calls[0][1]).toEqual(expect.objectContaining({ category: 'outros' }))
  expect(fs.commit).toHaveBeenCalledTimes(1)
})

test('splitBag replaces the bag with N bags keeping date, category and link', () => {
  const b = bag({ id: 'b1', amount: 5, unit: 'kg', addedKey: '2026-10-20', productId: 'v' })
  expect(splitBag(b, [1, 1, 1, 1, 1])).toHaveLength(5)
  expect(fs.delete).toHaveBeenCalledTimes(1)
  expect(fs.set.mock.calls[4][1]).toEqual(expect.objectContaining({ amount: 1, unit: 'kg', addedKey: '2026-10-20', productId: 'v', category: 'carne' }))
  expect(fs.commit).toHaveBeenCalledTimes(1)
})

test('splitBag refuses fewer than 2 parts or a zero part', () => {
  const b = bag({ amount: 5 })
  expect(() => splitBag(b, [5])).toThrow()
  expect(() => splitBag(b, [5, 0])).toThrow()
  expect(fs.commit).not.toHaveBeenCalled()
})

test('a hand-made bag split keeps no product link field', () => {
  splitBag(bag({ amount: 2 }), [1, 1])
  expect(fs.set.mock.calls[0][1]).not.toHaveProperty('productId')
})

test('addSameAsLast keeps the product link', () => {
  addSameAsLast(groupBags([bag({ productId: 'v' })])[0], '2026-10-30')
  expect(fs.set.mock.calls[0][1]).toEqual(expect.objectContaining({ productId: 'v' }))
})

test('deleteBags removes them in one batch', () => {
  deleteBags(['a', 'b'])
  expect(fs.delete).toHaveBeenCalledTimes(2)
  expect(fs.commit).toHaveBeenCalledTimes(1)
})

const flush = () => new Promise(r => setTimeout(r, 0))

test('a failed freezerLast update does not warn "não foi possível gravar" (the bags were saved)', async () => {
  const warned = vi.fn()
  window.addEventListener('casa:write-error', warned)
  fs.updateDoc.mockRejectedValueOnce(new Error('not-found'))
  freezeBought([{ product: prod({ id: 'gone', location: 'congelador' }), amount: 1, unit: 'un' }], '2026-10-30')
  await flush()
  window.removeEventListener('casa:write-error', warned)
  expect(warned).not.toHaveBeenCalled()
})

test('undoFreeze deletes the bags and puts back the previous last amount (or removes it)', () => {
  const kept = prod({ id: 'v', location: 'congelador', freezerLast: { amount: 2, unit: 'kg', key: '2026-10-01' } })
  const fresh = prod({ id: 'g', location: 'congelador' })
  const done = freezeBought([{ product: kept, amount: 5, unit: 'kg' }, { product: fresh, amount: 4, unit: 'un' }], '2026-10-30')
  vi.clearAllMocks()
  undoFreeze(done)
  expect(fs.delete).toHaveBeenCalledTimes(2)
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'products/v' }), { freezerLast: { amount: 2, unit: 'kg', key: '2026-10-01' } })
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'products/g' }), { freezerLast: 'DEL' })
})

test('splitBag requires the bag to still exist (the other phone may have taken it out)', () => {
  splitBag(bag({ id: 'b1', amount: 2 }), [1, 1])
  expect(fs.update).toHaveBeenCalledWith(expect.objectContaining({ path: 'freezerBags/b1' }), expect.any(Object))
  expect(fs.update.mock.invocationCallOrder[0]).toBeLessThan(fs.delete.mock.invocationCallOrder[0])
})
