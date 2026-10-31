import { act, renderHook } from '@testing-library/react'
import { useHour } from './useHour'

afterEach(() => vi.useRealTimers())

test('moves on to the next hour while the app stays open', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T07:59:00Z')) // 07:59 in Lisbon
  const { result } = renderHook(() => useHour())
  expect(result.current).toBe(7)
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(result.current).toBe(8)
})

test('re-checks the hour when the app comes back to the foreground', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T07:00:00Z'))
  const { result } = renderHook(() => useHour())
  vi.setSystemTime(new Date('2026-10-29T21:30:00Z')) // phone slept; timers did not fire
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(result.current).toBe(21)
})
