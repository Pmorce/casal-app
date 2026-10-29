import { addDays, weekdayOf, type DateKey } from './dates'
import type { Chore } from './types'

export function choreDue(c: Chore, today: DateKey): { visible: boolean; overdue: boolean } {
  if (c.kind === 'diaria') return { visible: c.lastDoneKey !== today, overdue: false }
  if (c.kind === 'pontual') return { visible: !c.lastDoneKey, overdue: false }
  // weekly: most recent occurrence on or before today
  const back = (weekdayOf(today) - (c.weekday ?? 0) + 7) % 7
  const occurrence = addDays(today, -back)
  if (occurrence < c.createdKey) return { visible: false, overdue: false }
  const visible = !c.lastDoneKey || c.lastDoneKey < occurrence
  // also overdue on its own day when the previous week's occurrence was missed
  const previous = addDays(occurrence, -7)
  const missedPrevious = previous >= c.createdKey && (!c.lastDoneKey || c.lastDoneKey < previous)
  return { visible, overdue: visible && (occurrence < today || missedPrevious) }
}
