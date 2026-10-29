import { arrayRemove, arrayUnion, collection, deleteDoc, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import { checkDocId, stepsOfDay, unlinkChecklist } from '../domain/routines'
import type { DateKey } from '../domain/dates'
import type { Checklist, Routine } from '../domain/types'

/** Firestore rejects `undefined` fields. */
const stripUndefined = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export const newId = (col: 'routines' | 'checklists' | 'steps') => doc(collection(db, col)).id

/** Also snapshots which steps applied that day, so editing the routine later does not rewrite history. */
export function toggleStep(routine: Routine, day: DateKey, stepId: string, done: boolean): void {
  fire(setDoc(
    doc(db, 'routineChecks', checkDocId(routine.id, day)),
    {
      ownerUid: routine.ownerUid,
      routineId: routine.id,
      dateKey: day,
      doneStepIds: done ? arrayUnion(stepId) : arrayRemove(stepId),
      dayStepIds: stepsOfDay(routine, day).map(s => s.id),
    },
    { merge: true },
  ))
}

export function saveRoutine(r: Routine): void {
  const { id, ...data } = r
  fire(setDoc(doc(db, 'routines', id), stripUndefined(data)))
}

export const deleteRoutine = (id: string) => fire(deleteDoc(doc(db, 'routines', id)))

export function toggleChecklistItem(c: Checklist, itemId: string, done: boolean): void {
  fire(updateDoc(doc(db, 'checklists', c.id), { checkedIds: done ? arrayUnion(itemId) : arrayRemove(itemId) }))
}

export const clearChecklist = (c: Checklist) => fire(updateDoc(doc(db, 'checklists', c.id), { checkedIds: [] }))

export function saveChecklist(c: Checklist): void {
  const { id, ...data } = c
  fire(setDoc(doc(db, 'checklists', id), stripUndefined(data)))
}

/** Also unlinks the steps that opened it, so no routine points to a missing checklist. */
export function deleteChecklist(id: string, routines: Routine[]): void {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'checklists', id))
  for (const r of routines) {
    const next = unlinkChecklist(r, id)
    if (next) batch.update(doc(db, 'routines', r.id), { steps: stripUndefined(next.steps) })
  }
  fire(batch.commit())
}
