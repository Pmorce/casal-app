import { todayKey, weekdayOf, addDays, daysBetween, msUntilNextMidnight } from './dates'

describe('todayKey (Europe/Lisbon)', () => {
  test('summer: 23:30 UTC is already the next day in Lisbon', () => {
    expect(todayKey(new Date('2026-07-14T23:30:00Z'))).toBe('2026-07-15')
  })
  test('winter: UTC equals Lisbon', () => {
    expect(todayKey(new Date('2026-12-31T23:59:00Z'))).toBe('2026-12-31')
    expect(todayKey(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01-01')
  })
})

test('weekdayOf: 0 = Sunday', () => {
  expect(weekdayOf('2026-10-29')).toBe(4)
  expect(weekdayOf('2026-11-01')).toBe(0)
})

test('addDays crosses month boundary', () => {
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
})

test('daysBetween', () => {
  expect(daysBetween('2026-07-01', '2026-10-01')).toBe(92)
})

test('msUntilNextMidnight in Lisbon', () => {
  expect(msUntilNextMidnight(new Date('2026-10-29T23:59:00Z'))).toBe(60_000)
  expect(msUntilNextMidnight(new Date('2026-07-14T22:59:00Z'))).toBe(60_000)
})
