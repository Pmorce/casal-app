import { toggleStep, toggleChecklistItem } from './routinesRepo'
import { routine, step } from '../domain/testFactories'

const fs = vi.hoisted(() => ({ setDoc: vi.fn(async () => {}), updateDoc: vi.fn(async () => {}) }))
vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', async () => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join('/')),
  setDoc: fs.setDoc,
  updateDoc: fs.updateDoc,
  arrayUnion: (v: string) => ({ union: v }),
  arrayRemove: (v: string) => ({ remove: v }),
}))

beforeEach(() => vi.clearAllMocks())

test('ticking a step merges into that day\'s check doc, always carrying the owner', async () => {
  toggleStep(routine({ id: 'r1', ownerUid: 'B', steps: [step({ id: 's1' }), step({ id: 'tue', days: [2] })] }), '2026-10-29', 's1', true)
  expect(fs.setDoc).toHaveBeenCalledWith(
    'routineChecks/r1_2026-10-29',
    { ownerUid: 'B', routineId: 'r1', dateKey: '2026-10-29', doneStepIds: { union: 's1' }, dayStepIds: ['s1'] },
    { merge: true },
  )
})

test('unticking removes the step id', async () => {
  await toggleStep(routine({ id: 'r1', ownerUid: 'B' }), '2026-10-29', 's1', false)
  expect(fs.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ doneStepIds: { remove: 's1' } }), { merge: true })
})

test('checklist item toggles with array union/remove', async () => {
  await toggleChecklistItem({ id: 'c1', ownerUid: 'B', name: 'Mala', items: [], checkedIds: [] }, 'i1', true)
  expect(fs.updateDoc).toHaveBeenCalledWith('checklists/c1', { checkedIds: { union: 'i1' } })
})
