import { stepsFor, dayStatus, monthHistory, checkDocId, unlinkChecklist, stepsWithoutDays, routineProgress } from './routines'
import { routine, step } from './testFactories'

const r = routine({
  id: 'r1',
  steps: [
    step({ id: 'a', period: 'noite', days: [0, 1, 2, 3, 4, 5, 6] }),
    step({ id: 'ret', period: 'noite', days: [2, 5] }),
    step({ id: 'red', period: 'noite', days: [3] }),
    step({ id: 'm', period: 'manha' }),
  ],
})

test('stepsFor shows only the steps for that weekday and period', () => {
  expect(stepsFor(r, '2026-10-27', 'noite').map(s => s.id)).toEqual(['a', 'ret']) // Tuesday
  expect(stepsFor(r, '2026-10-28', 'noite').map(s => s.id)).toEqual(['a', 'red']) // Wednesday
  expect(stepsFor(r, '2026-10-28', 'manha').map(s => s.id)).toEqual(['m'])
})

test('dayStatus', () => {
  expect(dayStatus(r, '2026-10-27', ['a', 'ret', 'm'])).toBe('completo')
  expect(dayStatus(r, '2026-10-27', ['a'])).toBe('parcial')
  expect(dayStatus(r, '2026-10-27', [])).toBe('nao')
  expect(dayStatus(r, '2026-10-27', ['red'])).toBe('nao') // step from another day does not count
  expect(dayStatus(routine({ steps: [step({ days: [3] })] }), '2026-10-27', [])).toBe('sem')
})

test('monthHistory covers every day of the month using stored checks', () => {
  const h = monthHistory(r, [{ id: 'r1_2026-02-03', ownerUid: 'B', routineId: 'r1', dateKey: '2026-02-03', doneStepIds: ['a', 'ret', 'm'] }], 2026, 2)
  expect(h).toHaveLength(28)
  expect(h[0].key).toBe('2026-02-01')
  expect(h[2]).toEqual({ key: '2026-02-03', status: 'completo' })
  expect(h[3].status).toBe('nao')
})

test('checkDocId', () => {
  expect(checkDocId('r1', '2026-10-29')).toBe('r1_2026-10-29')
})

test('history uses the steps that applied on that day, not today\'s list', () => {
  const now = routine({ id: 'r2', steps: [step({ id: 'a' }), step({ id: 'new' })] }) // 'new' added later
  const h = monthHistory(now, [{ id: 'x', ownerUid: 'B', routineId: 'r2', dateKey: '2026-02-03', doneStepIds: ['a'], dayStepIds: ['a'] }], 2026, 2)
  expect(h[2].status).toBe('completo')
})

test('unlinkChecklist drops the link from steps that open a deleted checklist', () => {
  const r2 = routine({ steps: [step({ id: 'a', checklistId: 'c1' }), step({ id: 'b' })] })
  expect(unlinkChecklist(r2, 'c1')?.steps.map(s => s.checklistId)).toEqual([undefined, undefined])
  expect(unlinkChecklist(r2, 'other')).toBeNull()
})

test('stepsWithoutDays lists named steps that would never show up', () => {
  expect(stepsWithoutDays([step({ text: 'Creme', days: [] }), step({ text: '', days: [] }), step({ text: 'Ok' })])).toEqual(['Creme'])
})

test('routineProgress counts the ticked steps of one period across routines', () => {
  const a = routine({ id: 'a', steps: [step({ id: 'x' }), step({ id: 'y' }), step({ id: 'n', period: 'noite' })] })
  const b = routine({ id: 'b', steps: [step({ id: 'z' })] })
  const checks = [
    { id: 'a_d', ownerUid: 'B', routineId: 'a', dateKey: '2026-10-29', doneStepIds: ['x', 'n'] },
    { id: 'b_old', ownerUid: 'B', routineId: 'b', dateKey: '2026-10-28', doneStepIds: ['z'] },
  ]
  const p = routineProgress([a, b], checks, '2026-10-29', 'manha')
  expect([p.done, p.total]).toEqual([1, 3])
  expect(p.rows.map(x => `${x.s.id}${x.on ? '+' : ''}`)).toEqual(['x+', 'y', 'z'])
})
