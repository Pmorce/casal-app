import { markChore, undoChore, addChore } from './choresRepo'
import { addExpense } from './expensesRepo'
import { chore } from '../domain/testFactories'

const fs = vi.hoisted(() => ({ updateDoc: vi.fn(async () => {}), addDoc: vi.fn(async () => ({ id: 'n' })), deleteField: () => 'DELETE' }))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', async () => ({
  collection: vi.fn((_db: unknown, p: string) => p),
  doc: vi.fn((_db: unknown, ...p: string[]) => p.join('/')),
  updateDoc: fs.updateDoc,
  addDoc: fs.addDoc,
  deleteDoc: vi.fn(),
  deleteField: fs.deleteField,
}))

beforeEach(() => vi.clearAllMocks())

test('marking a chore records the day and who did it', async () => {
  await markChore(chore({ id: 'c1' }), '2026-10-29', 'B')
  expect(fs.updateDoc).toHaveBeenCalledWith('chores/c1', { lastDoneKey: '2026-10-29', lastDoneBy: 'B' })
})

test('undo restores the previous values, removing fields that were absent', async () => {
  await undoChore(chore({ id: 'c1' }))
  expect(fs.updateDoc).toHaveBeenCalledWith('chores/c1', { lastDoneKey: 'DELETE', lastDoneBy: 'DELETE' })
  await undoChore(chore({ id: 'c2', lastDoneKey: '2026-10-28', lastDoneBy: 'P' }))
  expect(fs.updateDoc).toHaveBeenLastCalledWith('chores/c2', { lastDoneKey: '2026-10-28', lastDoneBy: 'P' })
})

test('a new chore stores its creation day; weekly ones need a weekday', async () => {
  await addChore({ title: ' Aspirar ', kind: 'semanal', weekday: 6 }, '2026-10-29')
  expect(fs.addDoc).toHaveBeenCalledWith('chores', { title: 'Aspirar', kind: 'semanal', weekday: 6, createdKey: '2026-10-29' })
  expect(() => addChore({ title: 'X', kind: 'semanal' }, '2026-10-29')).toThrow()
  expect(() => addChore({ title: '  ', kind: 'diaria' }, '2026-10-29')).toThrow()
})

test('adding a chore or an expense does not wait for the server', () => {
  fs.addDoc.mockImplementation(() => new Promise(() => {}))
  expect(addChore({ title: 'Aspirar', kind: 'diaria' }, '2026-10-29')).toBeUndefined()
  expect(addExpense(500, 'P', '2026-10-29')).toBeUndefined()
  fs.addDoc.mockImplementation(async () => ({ id: 'n' }))
})

test('expenses must be positive', async () => {
  expect(() => addExpense(0, 'P', '2026-10-29')).toThrow()
  await addExpense(1250, 'P', '2026-10-29', ' Continente ')
  expect(fs.addDoc).toHaveBeenCalledWith('expenses', { cents: 1250, uid: 'P', dateKey: '2026-10-29', note: 'Continente' })
})
