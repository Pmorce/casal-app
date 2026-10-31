import { useEffect, useState } from 'react'
import { lisbonHour } from '../domain/dates'

const HOUR_MS = 3_600_000

/** The hour (0–23) in Lisbon; updates on the hour and when the app returns to the foreground. */
export function useHour(): number {
  const [hour, setHour] = useState(() => lisbonHour(new Date()))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      const now = new Date()
      setHour(lisbonHour(now))
      clearTimeout(timer)
      // Lisbon is a whole number of hours off UTC, so its hours turn with UTC's
      timer = setTimeout(refresh, HOUR_MS - (now.getTime() % HOUR_MS) + 500)
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return hour
}
