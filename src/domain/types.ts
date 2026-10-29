import type { DateKey, Weekday } from './dates'

export type ShortageReason = 'acabou' | 'aAcabar'

export interface ShoppingItem {
  id: string
  text: string
  addedBy: string
  status: 'porComprar' | 'carrinho'
  productId?: string
  reason?: ShortageReason
  createdAt?: unknown
}

/** Casa zone; also how the shopping list is grouped in the supermarket. */
export type Zone = 'frigorifico' | 'despensa' | 'limpeza'

export interface Product {
  id: string
  name: string
  location: Zone
  /** purchase days, oldest first (last 8): the rhythm is learned from them */
  boughtKeys?: DateKey[]
  /** "Ainda há": not suggested before this day */
  snoozedUntil?: DateKey
  /** "Ainda há" taps since the last purchase */
  snoozeCount?: number
}

export type FreezerUnit = 'un' | 'g' | 'kg' | 'doses'

export interface FreezerBag {
  id: string
  name: string
  category: 'carne' | 'feita'
  amount: number
  unit: FreezerUnit
  addedKey: DateKey
  createdAt?: unknown
}

export interface Chore {
  id: string
  title: string
  kind: 'diaria' | 'semanal' | 'pontual'
  weekday?: Weekday
  lastDoneKey?: DateKey
  lastDoneBy?: string
  createdKey: DateKey
}

export interface Expense {
  id: string
  uid: string
  cents: number
  dateKey: DateKey
  note?: string
}

export interface Step {
  id: string
  text: string
  note?: string
  period: 'manha' | 'noite'
  days: Weekday[]
  checklistId?: string
}

export interface Routine {
  id: string
  ownerUid: string
  name: string
  note?: string
  order: number
  steps: Step[]
  /** day the routine was created; history before it shows as empty */
  createdKey?: DateKey
}

export interface RoutineCheck {
  id: string
  ownerUid: string
  routineId: string
  dateKey: DateKey
  doneStepIds: string[]
  /** steps that applied that day, saved when ticking; history uses it so later edits do not rewrite the past */
  dayStepIds?: string[]
}

export interface Checklist {
  id: string
  ownerUid: string
  name: string
  items: { id: string; text: string }[]
  checkedIds: string[]
}
