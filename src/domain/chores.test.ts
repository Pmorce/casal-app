import { choreDue } from './chores'
import { chore } from './testFactories'

describe('weekly chore (Saturday)', () => {
  const sab = chore({ kind: 'semanal', weekday: 6, lastDoneKey: '2026-10-24' }) // done last Saturday
  test('not visible before its day', () => {
    expect(choreDue(sab, '2026-10-30')).toEqual({ visible: false, overdue: false })
  })
  test('visible on its day', () => {
    expect(choreDue(sab, '2026-10-31')).toEqual({ visible: true, overdue: false })
  })
  test('stays visible and overdue across the week boundary', () => {
    expect(choreDue(sab, '2026-11-02')).toEqual({ visible: true, overdue: true })
  })
  test('done late: hidden until next Saturday', () => {
    expect(choreDue({ ...sab, lastDoneKey: '2026-11-02' }, '2026-11-06')).toEqual({ visible: false, overdue: false })
    expect(choreDue({ ...sab, lastDoneKey: '2026-11-02' }, '2026-11-07').visible).toBe(true)
  })
  test('created on Thursday: first appears on Saturday', () => {
    const c = chore({ kind: 'semanal', weekday: 6, createdKey: '2026-10-29' })
    expect(choreDue(c, '2026-10-29').visible).toBe(false)
    expect(choreDue(c, '2026-10-31').visible).toBe(true)
  })
})

test('daily chore comes back every day', () => {
  expect(choreDue(chore({ kind: 'diaria', lastDoneKey: '2026-10-28' }), '2026-10-29').visible).toBe(true)
  expect(choreDue(chore({ kind: 'diaria', lastDoneKey: '2026-10-29' }), '2026-10-29').visible).toBe(false)
})

test('one-off chore disappears once done', () => {
  expect(choreDue(chore({ kind: 'pontual', lastDoneKey: '2026-10-01' }), '2026-10-29').visible).toBe(false)
  expect(choreDue(chore({ kind: 'pontual' }), '2026-10-29').visible).toBe(true)
})

test('weekly chore missed for a whole week is still flagged overdue on its next day', () => {
  const sab = chore({ kind: 'semanal', weekday: 6, lastDoneKey: '2026-10-24' }) // missed 31/10
  expect(choreDue(sab, '2026-11-07')).toEqual({ visible: true, overdue: true })
})
