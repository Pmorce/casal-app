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

export type RoutineRow = { r: Routine; s: Step; on: boolean }

/** One person's steps for a period today, ticked or not, with the count (Hoje's cards and moment line). */
export function routineProgress(routines: Routine[], checks: RoutineCheck[], day: DateKey, period: Step['period']): { rows: RoutineRow[]; done: number; total: number } {
  const doneIds = (r: Routine) => checks.find(c => c.routineId === r.id && c.dateKey === day)?.doneStepIds ?? []
  const rows = routines.flatMap(r => stepsFor(r, day, period).map(s => ({ r, s, on: doneIds(r).includes(s.id) })))
  return { rows, done: rows.filter(x => x.on).length, total: rows.length }
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

/** The routine without links to a deleted checklist, or null when it had none. */
export function unlinkChecklist(routine: Routine, checklistId: string): Routine | null {
  if (!routine.steps.some(s => s.checklistId === checklistId)) return null
  return { ...routine, steps: routine.steps.map(s => (s.checklistId === checklistId ? { ...s, checklistId: undefined } : s)) }
}

/** Named steps with no day picked: they would never appear, so saving asks for a day instead of dropping them. */
export function stepsWithoutDays(steps: Step[]): string[] {
  return steps.filter(s => s.text.trim() && !s.days.length).map(s => s.text.trim())
}
