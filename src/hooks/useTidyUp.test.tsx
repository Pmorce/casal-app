import { render } from '@testing-library/react'
import * as fs from 'firebase/firestore'
import { applyTidy } from '../data/tidyRepo'
import { useTidyUp } from './useTidyUp'

vi.mock('firebase/firestore', () => ({ collection: (_db: unknown, name: string) => name, onSnapshot: vi.fn() }))
vi.mock('../data/firebase', () => ({ db: {} }))
vi.mock('../data/tidyRepo', () => ({ applyTidy: vi.fn() }))

type Cb = (snap: unknown) => void
let cbs: Record<string, Cb>

function Probe() {
  useTidyUp()
  return null
}

const snap = (docs: Record<string, unknown>[], meta: { fromCache?: boolean; hasPendingWrites?: boolean } = {}) => ({
  docs: docs.map(({ id, ...data }) => ({ id, data: () => data })),
  metadata: { fromCache: false, hasPendingWrites: false, ...meta },
})

const dup = [{ id: 'a', name: 'Leite', location: 'frigorifico', boughtKeys: [] }, { id: 'b', name: 'Leite', location: 'frigorifico', boughtKeys: ['2026-10-01'] }]
const emit = (meta?: { fromCache?: boolean; hasPendingWrites?: boolean }, products: Record<string, unknown>[] = dup) => {
  cbs.products(snap(products, meta))
  cbs.shopping(snap([], meta))
  cbs.freezerBags(snap([], meta))
}

beforeEach(() => {
  cbs = {}
  vi.mocked(fs.onSnapshot).mockImplementation(((ref: string, _o: unknown, next: Cb) => { cbs[ref] = next; return () => {} }) as never)
  vi.mocked(applyTidy).mockClear()
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  render(<Probe />)
})
afterEach(() => vi.restoreAllMocks())

test('fresh server data with a duplicate product applies the plan once', () => {
  emit()
  expect(applyTidy).toHaveBeenCalledTimes(1)
  expect(vi.mocked(applyTidy).mock.calls[0][0].deleteProducts).toEqual(['a'])
})

test('cached or pending snapshots do nothing', () => {
  emit({ fromCache: true })
  emit({ hasPendingWrites: true })
  expect(applyTidy).not.toHaveBeenCalled()
})

test('offline does nothing', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  emit()
  expect(applyTidy).not.toHaveBeenCalled()
})

test('clean data does nothing', () => {
  emit(undefined, [dup[1]])
  expect(applyTidy).not.toHaveBeenCalled()
})
