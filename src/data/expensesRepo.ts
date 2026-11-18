import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import type { DateKey } from '../domain/dates'

/** Throws on invalid input; otherwise writes in the background. */
export function addExpense(cents: number, uid: string, dateKey: DateKey, note?: string, store?: string): void {
  if (!Number.isInteger(cents) || cents <= 0) throw new Error('Valor inválido')
  const n = note?.trim()
  fire(addDoc(collection(db, 'expenses'), { cents, uid, dateKey, ...(n ? { note: n } : {}), ...(store ? { store } : {}) }))
}

export const deleteExpense = (id: string) => fire(deleteDoc(doc(db, 'expenses', id)))
