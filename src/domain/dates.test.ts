import { todayKey, weekdayOf, addDays, daysBetween, msUntilNextMidnight, nextDateCheck, lisbonHour } from './dates'

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

test('nextDateCheck waits until just after midnight, but never more than an hour (DST days)', () => {
  expect(nextDateCheck(new Date('2026-10-30T12:00:00Z'))).toBe(3_600_000)
  expect(nextDateCheck(new Date('2026-10-30T23:59:00Z'))).toBe(60_000 + 500)
})

test('lisbonHour is the Lisbon wall-clock hour', () => {
  expect(lisbonHour(new Date('2026-07-01T22:30:00Z'))).toBe(23)
  expect(lisbonHour(new Date('2026-01-01T00:10:00Z'))).toBe(0)
})
