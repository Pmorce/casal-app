import { useEffect, useState } from 'react'
import { nextDateCheck, todayKey, type DateKey } from '../domain/dates'

/** Today's date in Lisbon; updates at midnight and when the app returns to the foreground. */
export function useToday(): DateKey {
  const [today, setToday] = useState(() => todayKey(new Date()))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      setToday(todayKey(new Date()))
      clearTimeout(timer)
      timer = setTimeout(refresh, nextDateCheck(new Date()))
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return today
}
