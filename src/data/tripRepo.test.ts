import { addCustomStore, changeStore, leaveTrip, restoreTrip, startTrip } from './tripRepo'

const fs = vi.hoisted(() => ({
  setDoc: vi.fn(async (_ref: unknown, _data: Record<string, unknown>, _opts?: unknown) => {}),
  deleteDoc: vi.fn(async (_ref: unknown) => {}),
}))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('./write', () => ({ fire: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') })),
  setDoc: fs.setDoc,
  deleteDoc: fs.deleteDoc,
  serverTimestamp: () => 'now',
}))

const trip = { id: 'trip', store: 'Lidl', stores: ['Lidl'], startedBy: 'P', dateKey: '2026-10-29' }
beforeEach(() => vi.clearAllMocks())

test('startTrip writes meta/trip with the store, who and the day', () => {
  startTrip('Lidl', 'P', '2026-10-29')
  expect(fs.setDoc).toHaveBeenCalledWith({ path: 'meta/trip' },
    { store: 'Lidl', stores: ['Lidl'], startedBy: 'P', dateKey: '2026-10-29', startedAt: 'now' })
})

test('changing store appends it to the stores visited', () => {
  changeStore(trip, 'Continente')
  expect(fs.setDoc).toHaveBeenCalledWith({ path: 'meta/trip' }, { store: 'Continente', stores: ['Lidl', 'Continente'] }, { merge: true })
})

test('going back to a store already visited does not duplicate it', () => {
  changeStore({ ...trip, store: 'Continente', stores: ['Lidl', 'Continente'] }, 'Lidl')
  expect(fs.setDoc).toHaveBeenCalledWith({ path: 'meta/trip' }, { store: 'Lidl', stores: ['Lidl', 'Continente'] }, { merge: true })
})

test('leaving deletes meta/trip and restoring puts it back', () => {
  leaveTrip()
  expect(fs.deleteDoc).toHaveBeenCalledWith({ path: 'meta/trip' })
  restoreTrip(trip)
  expect(fs.setDoc).toHaveBeenCalledWith({ path: 'meta/trip' }, { store: 'Lidl', stores: ['Lidl'], startedBy: 'P', dateKey: '2026-10-29' })
})

test('a custom store is appended; a duplicate (case/accents) is skipped', () => {
  addCustomStore('Talho Zé', ['Padaria'])
  expect(fs.setDoc).toHaveBeenCalledWith({ path: 'meta/stores' }, { custom: ['Padaria', 'Talho Zé'] }, { merge: true })
  fs.setDoc.mockClear()
  addCustomStore('talho ze', ['Talho Zé'])
  expect(fs.setDoc).not.toHaveBeenCalled()
})
