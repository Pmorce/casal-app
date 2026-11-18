import { changeCount, setCount, setLastQty, setUncounted } from './stockRepo'
import { prod } from '../domain/testFactories'

const fs = vi.hoisted(() => ({ updateDoc: vi.fn(async () => {}) }))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('./write', () => ({ fire: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') })),
  updateDoc: fs.updateDoc,
  deleteField: () => 'DEL',
  increment: (n: number) => ({ increment: n }),
}))

beforeEach(() => vi.clearAllMocks())
const p = prod({ id: 'p1', name: 'Kefir' })

test('"−" is a relative write, so two phones both count', () => {
  changeCount(p, -1)
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'products/p1' }, { count: { increment: -1 } })
})

test('"Quantos há?" sets the number and settles a pending confirmation', () => {
  setCount(p, 6)
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'products/p1' }, { count: 6, qtyPending: 'DEL' })
})

test('"Não contar este" on and off never writes undefined', () => {
  setUncounted(p, true)
  expect(fs.updateDoc).toHaveBeenLastCalledWith({ path: 'products/p1' }, { uncounted: true })
  setUncounted(p, false)
  expect(fs.updateDoc).toHaveBeenLastCalledWith({ path: 'products/p1' }, { uncounted: 'DEL' })
})

test('the usual quantity is stored as given', () => {
  setLastQty(p, 4)
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'products/p1' }, { lastQty: 4 })
})
