import { addDoc, collection, deleteDoc, deleteField, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import { cleanText } from '../domain/shopping'
import type { DateKey, Weekday } from '../domain/dates'
import type { Chore } from '../domain/types'

export function markChore(c: Chore, today: DateKey, uid: string): void {
  fire(updateDoc(doc(db, 'chores', c.id), { lastDoneKey: today, lastDoneBy: uid }))
}

/** Puts back the values the chore had before it was marked (pass the chore as it was). */
export function undoChore(before: Chore): void {
  fire(updateDoc(doc(db, 'chores', before.id), {
    lastDoneKey: before.lastDoneKey ?? deleteField(),
    lastDoneBy: before.lastDoneBy ?? deleteField(),
  }))
}

/** Throws on invalid input; otherwise writes in the background. */
export function addChore(input: { title: string; kind: Chore['kind']; weekday?: Weekday }, today: DateKey): void {
  const title = cleanText(input.title)
  if (!title) throw new Error('Falta o nome')
  if (input.kind === 'semanal' && input.weekday === undefined) throw new Error('Falta o dia da semana')
  fire(addDoc(collection(db, 'chores'), {
    title,
    kind: input.kind,
    ...(input.kind === 'semanal' ? { weekday: input.weekday } : {}),
    createdKey: today,
  }))
}

export const deleteChore = (id: string) => fire(deleteDoc(doc(db, 'chores', id)))
