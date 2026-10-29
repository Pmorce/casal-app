import { addBags, removeOldest } from './freezerRepo'
import { groupBags } from '../domain/freezer'
import { bag } from '../domain/testFactories'

const fs = vi.hoisted(() => ({
  set: vi.fn(),
  commit: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
}))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', async () => ({
  collection: vi.fn(() => 'bagsRef'),
  doc: vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') || 'new' })),
  writeBatch: () => ({ set: fs.set, commit: fs.commit }),
  deleteDoc: fs.deleteDoc,
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
  expect(fs.deleteDoc).toHaveBeenCalledWith({ path: 'freezerBags/old' })
})
