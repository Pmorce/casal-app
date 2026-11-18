import { addBags, addFromOrigin, addSameAsLast, backToFreezer, cook, deleteBags, undoCook, useDose as eatDose, freezeBought, moveToFridge, removeOldest, splitBag, undoFreeze, undoOrigin } from './freezerRepo'
import { groupBags } from '../domain/freezer'
import { bag, prod } from '../domain/testFactories'

const fs = vi.hoisted(() => ({
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async (_ref: unknown, _data: unknown) => {}),
  setDoc: vi.fn(async (_ref: unknown, _data: unknown) => {}),
  n: 0,
}))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', async () => ({
  collection: vi.fn((_db: unknown, name: string) => name),
  // doc(collection) → a new id in that collection; doc(db, collection, id) → that document
  doc: vi.fn((...args: unknown[]) => {
    if (args.length === 1) { const id = `new${++fs.n}`; return { id, path: `${String(args[0])}/${id}` } }
    return { id: String(args[2]), path: args.slice(1).join('/') }
  }),
  writeBatch: () => ({ set: fs.set, update: fs.update, delete: fs.delete, commit: fs.commit }),
  deleteField: () => 'DEL',
  deleteDoc: fs.deleteDoc,
  updateDoc: fs.updateDoc,
  setDoc: fs.setDoc,
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

test('freezeBought writes the amount into the purchase (quiet, on its own); undo puts the previous one back or removes it', () => {
  const v = prod({ id: 'v', location: 'congelador' })
  const done = freezeBought([
    { product: v, amount: 3, unit: 'kg', purchaseId: 'pu1', was: { amount: 2, unit: 'kg' } },
    { product: v, amount: 1, unit: 'kg', purchaseId: 'pu2' },
    { product: v, amount: 1, unit: 'un' },
  ], '2026-10-30')
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'purchases/pu1' }), { amount: 3, unit: 'kg' })
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'purchases/pu2' }), { amount: 1, unit: 'kg' })
  expect(fs.updateDoc.mock.calls.filter(c => (c[0] as { path: string }).path.startsWith('purchases/'))).toHaveLength(2)
  expect(done.previous.length).toBe(3)
  expect(done.purchases).toEqual([{ id: 'pu1', amount: 2, unit: 'kg' }, { id: 'pu2' }])
  vi.clearAllMocks()
  undoFreeze(done)
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'purchases/pu1' }), { amount: 2, unit: 'kg' })
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'purchases/pu2' }), { amount: 'DEL', unit: 'DEL' })
})

test('moveToFridge marks the bag as thawing since today; backToFreezer removes both fields', () => {
  const b = bag({ id: 'b1' })
  moveToFridge(b, '2026-11-18')
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'freezerBags/b1' }), { where: 'frigorifico', movedKey: '2026-11-18' })
  backToFreezer(b)
  expect(fs.updateDoc).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'freezerBags/b1' }), { where: 'DEL', movedKey: 'DEL' })
})

const purchaseWrites = () => fs.setDoc.mock.calls.filter(c => (c[0] as { path: string }).path.startsWith('purchases/'))
const bagWrites = () => fs.set.mock.calls.concat(fs.setDoc.mock.calls).filter(c => (c[0] as { path: string }).path.startsWith('freezerBags/'))

test("addFromOrigin 'comprei': the bag, a purchase row with amount, unit and store, and the product's rhythm and last amount", () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador', boughtKeys: ['2026-10-01'] })
  const g = groupBags([bag({ name: 'Vaca', amount: 1, unit: 'kg', productId: 'v' })])[0]
  const done = addFromOrigin(g, 'comprei', 3, '2026-11-18', { uid: 'P', store: 'Lidl', product: v })
  expect(bagWrites()).toHaveLength(1)
  expect(bagWrites()[0][1]).toEqual(expect.objectContaining({ name: 'Vaca', category: 'carne', amount: 3, unit: 'kg', addedKey: '2026-11-18', productId: 'v' }))
  expect(purchaseWrites()).toHaveLength(1)
  const row = purchaseWrites()[0][1] as Record<string, unknown>
  expect(row).toEqual(expect.objectContaining({ name: 'Vaca', productId: 'v', store: 'Lidl', dateKey: '2026-11-18', by: 'P', amount: 3, unit: 'kg' }))
  expect(typeof row.finishId).toBe('string')
  expect(Object.values(row)).not.toContain(undefined)
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'products/v' }),
    { boughtKeys: ['2026-10-01', '2026-11-18'], freezerLast: { amount: 3, unit: 'kg', key: '2026-11-18' }, snoozedUntil: 'DEL', snoozeCount: 'DEL' })
  expect(done.purchaseId).toBe((purchaseWrites()[0][0] as { id: string }).id)
  expect(done.previous).toEqual({ id: 'v', boughtKeys: ['2026-10-01'] })
})

test("addFromOrigin 'comprei' clears the back-off and undo puts it back", () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador', snoozedUntil: '2026-12-01', snoozeCount: 2 })
  const g = groupBags([bag({ name: 'Vaca', amount: 1, unit: 'kg', productId: 'v' })])[0]
  const done = addFromOrigin(g, 'comprei', 3, '2026-11-18', { uid: 'P', product: v })
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'products/v' }), expect.objectContaining({ snoozedUntil: 'DEL', snoozeCount: 'DEL' }))
  expect(done.previous).toEqual(expect.objectContaining({ snoozedUntil: '2026-12-01', snoozeCount: 2 }))
  fs.updateDoc.mockClear()
  undoOrigin(done)
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'products/v' }), expect.objectContaining({ snoozedUntil: '2026-12-01', snoozeCount: 2 }))
})

test("addFromOrigin 'comprei' without store or product writes no undefined fields", () => {
  const g = groupBags([bag({ name: 'Gelado', category: 'outros', amount: 1, unit: 'un' })])[0]
  addFromOrigin(g, 'comprei', 2, '2026-11-18', { uid: 'P' })
  const row = purchaseWrites()[0][1] as Record<string, unknown>
  expect(row).not.toHaveProperty('store')
  expect(row).not.toHaveProperty('productId')
  expect(Object.values(row)).not.toContain(undefined)
  expect(fs.updateDoc).not.toHaveBeenCalled()
})

test("addFromOrigin 'ofereceram' writes only the bag, no purchase", () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  const g = groupBags([bag({ name: 'Vaca', amount: 1, unit: 'kg', productId: 'v' })])[0]
  const done = addFromOrigin(g, 'ofereceram', 2, '2026-11-18', { uid: 'P', store: 'Lidl', product: v })
  expect(bagWrites()).toHaveLength(1)
  expect(purchaseWrites()).toHaveLength(0)
  expect(fs.updateDoc).not.toHaveBeenCalled()
  expect(done.purchaseId).toBeUndefined()
  expect(done.previous).toBeUndefined()
})

test("addFromOrigin 'cozinhei' writes a comida feita bag, without the bought product's link", () => {
  const g = groupBags([bag({ name: 'Vaca', amount: 1, unit: 'kg', productId: 'v' })])[0]
  addFromOrigin(g, 'cozinhei', 4, '2026-11-18', { uid: 'P' })
  expect(bagWrites()[0][1]).toEqual(expect.objectContaining({ name: 'Vaca', category: 'feita', amount: 4, unit: 'kg', addedKey: '2026-11-18' }))
  expect(bagWrites()[0][1]).not.toHaveProperty('productId')
  expect(purchaseWrites()).toHaveLength(0)
})

test('addFromOrigin refuses an amount that is not above 0', () => {
  const g = groupBags([bag({ name: 'Vaca' })])[0]
  expect(() => addFromOrigin(g, 'comprei', 0, '2026-11-18', { uid: 'P' })).toThrow()
  expect(bagWrites()).toHaveLength(0)
  expect(purchaseWrites()).toHaveLength(0)
})

test('undoOrigin deletes the bag and the purchase and puts the product back as it was', () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  const g = groupBags([bag({ name: 'Vaca', amount: 1, unit: 'kg', productId: 'v' })])[0]
  const done = addFromOrigin(g, 'comprei', 3, '2026-11-18', { uid: 'P', product: v })
  vi.clearAllMocks()
  undoOrigin(done)
  expect(fs.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: `freezerBags/${done.bagId}` }))
  expect(fs.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: `purchases/${done.purchaseId}` }))
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'products/v' }), { boughtKeys: 'DEL', freezerLast: 'DEL', snoozedUntil: 'DEL', snoozeCount: 'DEL' })
})

test('cook: 4 for the freezer and 2 for the fridge make two feita bags and delete the source', () => {
  const src = bag({ id: 'src', name: 'Vaca', amount: 1, unit: 'kg' })
  const done = cook({ name: ' Arroz de vaca ', freezerDoses: 4, fridgeDoses: 2, madeFrom: 'Vaca 1 kg' }, '2026-11-18', src)
  const writes = fs.setDoc.mock.calls.filter(c => (c[0] as { path: string }).path.startsWith('freezerBags/new'))
  expect(writes).toHaveLength(2)
  expect(writes[0][1]).toEqual(expect.objectContaining({ name: 'Arroz de vaca', category: 'feita', unit: 'doses', amount: 4, addedKey: '2026-11-18', madeFrom: 'Vaca 1 kg' }))
  expect(writes[0][1]).not.toHaveProperty('where')
  expect(writes[1][1]).toEqual(expect.objectContaining({ amount: 2, where: 'frigorifico', movedKey: '2026-11-18', madeFrom: 'Vaca 1 kg' }))
  expect(fs.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'freezerBags/src' }))
  expect(done.bagIds).toHaveLength(2)
  expect(done.source).toBe(src)
})

test('cook: only the freezer field makes one bag, with no undefined fields', () => {
  const done = cook({ name: 'Sopa', freezerDoses: 4, fridgeDoses: 0 }, '2026-11-18')
  const writes = fs.setDoc.mock.calls.filter(c => (c[0] as { path: string }).path.startsWith('freezerBags/new'))
  expect(writes).toHaveLength(1)
  expect(Object.values(writes[0][1] as object)).not.toContain(undefined)
  expect(writes[0][1]).not.toHaveProperty('madeFrom')
  expect(done.bagIds).toHaveLength(1)
  expect(fs.deleteDoc).not.toHaveBeenCalled()
})

test('cook rejects a blank name or no doses', () => {
  expect(() => cook({ name: ' ', freezerDoses: 1, fridgeDoses: 0 }, '2026-11-18')).toThrow()
  expect(() => cook({ name: 'Sopa', freezerDoses: 0, fridgeDoses: 0 }, '2026-11-18')).toThrow()
})

test('undoCook restores the source and deletes the new bags', () => {
  const src = bag({ id: 'src', name: 'Vaca' })
  const done = cook({ name: 'Sopa', freezerDoses: 2, fridgeDoses: 1 }, '2026-11-18', src)
  vi.clearAllMocks()
  undoCook(done)
  expect(fs.setDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'freezerBags/src' }), expect.not.objectContaining({ id: 'src' }))
  for (const id of done.bagIds) expect(fs.delete).toHaveBeenCalledWith(expect.objectContaining({ path: `freezerBags/${id}` }))
})

test('useDose takes one dose off a bag of doses, otherwise deletes the bag', () => {
  const b = bag({ id: 'f', category: 'feita', unit: 'doses', amount: 3 })
  expect(eatDose(b)).toBe(b)
  expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'freezerBags/f' }), { amount: 2 })
  eatDose(bag({ id: 'l', unit: 'doses', amount: 1 }))
  eatDose(bag({ id: 'k', unit: 'kg', amount: 2 }))
  expect(fs.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'freezerBags/l' }))
  expect(fs.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'freezerBags/k' }))
})
