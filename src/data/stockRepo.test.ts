import { changeCount, clearQtyPending, markQtyPending, setCount, setLastQty, setPurchaseQty, setUncounted, undoEntrada } from './stockRepo'
import { fire } from './write'
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

test('"Comprei" on a counted product puts the units on its purchase row, quietly', () => {
  setPurchaseQty('pu1', 4)
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'purchases/pu1' }, { amount: 4, unit: 'un' })
  expect(fire).toHaveBeenCalledWith(expect.anything(), { quiet: true })
})

test('"Agora não" (Rui) marks each product pending, one update each', () => {
  markQtyPending([p, prod({ id: 'p2', name: 'Água' })])
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'products/p1' }, { qtyPending: true })
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'products/p2' }, { qtyPending: true })
  expect(fs.updateDoc).toHaveBeenCalledTimes(2)
})

test('putting the number in settles the pending mark', () => {
  clearQtyPending(p)
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'products/p1' }, { qtyPending: 'DEL' })
})

test('undoing "O que entrou" (Ana) takes the units away and puts lastQty and qtyPending back as they were', () => {
  const was = prod({ id: 'k', name: 'Kefir', qtyPending: true })
  const agua = prod({ id: 'a', name: 'Água' })
  undoEntrada({ saved: [{ product: was, n: 4 }], pending: [agua] })
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'products/k' }, { count: { increment: -4 } })
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'products/k' }, { lastQty: 'DEL', qtyPending: true })
  expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'products/a' }, { qtyPending: 'DEL' })
  for (const [, data] of fs.updateDoc.mock.calls as unknown as [unknown, Record<string, unknown>][]) {
    expect(Object.values(data)).not.toContain(undefined)
  }
})
