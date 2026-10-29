import { addDays, weekdayOf, type DateKey } from './dates'
import type { Routine, RoutineCheck, Step } from './types'

export type DayStatus = 'completo' | 'parcial' | 'nao' | 'sem'

export function checkDocId(routineId: string, day: DateKey): string {
  return `${routineId}_${day}`
}

export function stepsOfDay(routine: Routine, day: DateKey): Step[] {
  const wd = weekdayOf(day)
  return routine.steps.filter(s => s.days.includes(wd))
}

export function stepsFor(routine: Routine, day: DateKey, period: Step['period']): Step[] {
  return stepsOfDay(routine, day).filter(s => s.period === period)
}

export function dayStatus(routine: Routine, day: DateKey, doneStepIds: string[]): DayStatus {
  const steps = stepsOfDay(routine, day)
  if (!steps.length) return 'sem'
  const done = steps.filter(s => doneStepIds.includes(s.id)).length
  return done === steps.length ? 'completo' : done ? 'parcial' : 'nao'
}

function snapshotStatus(dayStepIds: string[], doneStepIds: string[]): DayStatus {
  if (!dayStepIds.length) return 'sem'
  const done = dayStepIds.filter(id => doneStepIds.includes(id)).length
  return done === dayStepIds.length ? 'completo' : done ? 'parcial' : 'nao'
}

export function monthHistory(routine: Routine, checks: RoutineCheck[], year: number, month: number): { key: DateKey; status: DayStatus }[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const out: { key: DateKey; status: DayStatus }[] = []
  for (let key = first; key.slice(0, 7) === first.slice(0, 7); key = addDays(key, 1)) {
    const check = checks.find(c => c.routineId === routine.id && c.dateKey === key)
    out.push({ key, status: check?.dayStepIds ? snapshotStatus(check.dayStepIds, check.doneStepIds) : dayStatus(routine, key, check?.doneStepIds ?? []) })
  }
  return out
}
