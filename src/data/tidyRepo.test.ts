import { applyTidy } from './tidyRepo'
import { fire } from './write'

const fs = vi.hoisted(() => ({
  log: [] as string[],
  updateDoc: vi.fn((ref: { path: string }) => { fs.log.push(`update ${ref.path}`); return Promise.resolve() }),
  deleteDoc: vi.fn((ref: { path: string }) => { fs.log.push(`delete ${ref.path}`); return Promise.resolve() }),
}))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('./write', () => ({ fire: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') })),
  updateDoc: fs.updateDoc,
  deleteDoc: fs.deleteDoc,
}))

beforeEach(() => { vi.clearAllMocks(); fs.log.length = 0 })

test('relinks before deleting, and deletes the losing product last', () => {
  applyTidy({
    products: [{ id: 'a', data: { boughtKeys: [] } }],
    items: [{ id: 'i1', data: { productId: 'a' } }],
    bags: [{ id: 'b1', data: { productId: 'a' } }],
    deleteItems: ['i2'],
    deleteProducts: ['b'],
    isEmpty: false,
  } as never)
  // deleting the losing product before relinking would leave orphans that tidy-up never repairs
  expect(fs.log).toEqual(['update products/a', 'update shopping/i1', 'update freezerBags/b1', 'delete shopping/i2', 'delete products/b'])
})

test('every write is quiet', () => {
  applyTidy({
    products: [{ id: 'a', data: {} }], items: [{ id: 'i1', data: {} }], bags: [{ id: 'b1', data: {} }],
    deleteItems: ['i2'], deleteProducts: ['b'], isEmpty: false,
  } as never)
  const calls = vi.mocked(fire).mock.calls
  expect(calls).toHaveLength(5)
  calls.forEach(c => expect(c[1]).toEqual({ quiet: true }))
})
