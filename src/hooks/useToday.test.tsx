import { act, renderHook } from '@testing-library/react'
import { useToday } from './useToday'

afterEach(() => vi.useRealTimers())

test('rolls over to the new day at Lisbon midnight while the app stays open', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T23:59:30Z'))
  const { result } = renderHook(() => useToday())
  expect(result.current).toBe('2026-10-29')
  act(() => { vi.advanceTimersByTime(31_000) })
  expect(result.current).toBe('2026-10-30')
})

test('re-checks the day when the app comes back to the foreground', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T12:00:00Z'))
  const { result } = renderHook(() => useToday())
  vi.setSystemTime(new Date('2026-10-31T09:00:00Z')) // phone slept; timers did not fire
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(result.current).toBe('2026-10-31')
})
