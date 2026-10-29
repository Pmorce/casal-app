import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import { cleanText } from '../domain/shopping'
import { oldestBag, type FreezerGroup } from '../domain/freezer'
import type { DateKey } from '../domain/dates'
import type { FreezerBag } from '../domain/types'

export interface NewBags {
  name: string
  category: FreezerBag['category']
  amount: number
  unit: FreezerBag['unit']
  count: number
}

/** Throws on invalid input; otherwise writes in the background. */
export function addBags(input: NewBags, today: DateKey): void {
  const name = cleanText(input.name)
  if (!name) throw new Error('Nome em falta')
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 20) throw new Error('Nº de sacos inválido')
  if (!(input.amount > 0)) throw new Error('Quantidade inválida')
  const batch = writeBatch(db)
  for (let i = 0; i < input.count; i++) {
    batch.set(doc(collection(db, 'freezerBags')), {
      name, category: input.category, amount: input.amount, unit: input.unit, addedKey: today, createdAt: serverTimestamp(),
    })
  }
  fire(batch.commit())
}

/** "−": removes the oldest bag (first in, first out) and returns it so the UI can undo. */
export function removeOldest(g: FreezerGroup): FreezerBag {
  const bag = oldestBag(g)
  fire(deleteDoc(doc(db, 'freezerBags', bag.id)))
  return bag
}

export function restoreBag(b: FreezerBag): void {
  const { id, ...data } = b
  fire(setDoc(doc(db, 'freezerBags', id), data))
}

/** "+": another bag like the most recent one, entered today. */
export function addSameAsLast(g: FreezerGroup, today: DateKey): void {
  const last = g.bags[g.bags.length - 1]
  addBags({ name: last.name, category: last.category, amount: last.amount, unit: last.unit, count: 1 }, today)
}

export function updateBag(b: FreezerBag, changes: Partial<Pick<FreezerBag, 'amount' | 'addedKey'>>): void {
  fire(updateDoc(doc(db, 'freezerBags', b.id), changes))
}

export const deleteBag = (id: string) => fire(deleteDoc(doc(db, 'freezerBags', id)))
