import { deleteDoc, doc, updateDoc } from 'firebase/firestore'
import type { TidyPlan } from '../domain/tidy'
import { db } from './firebase'
import { fire } from './write'

/**
 * Applies a tidy-up plan, one write per doc and none awaited: no batch, so a doc the other phone
 * already removed fails alone instead of taking the rest down.
 */
export function applyTidy(plan: TidyPlan): void {
  const q = { quiet: true }
  for (const p of plan.products) fire(updateDoc(doc(db, 'products', p.id), p.data), q)
  for (const i of plan.items) fire(updateDoc(doc(db, 'shopping', i.id), i.data), q)
  for (const b of plan.bags) fire(updateDoc(doc(db, 'freezerBags', b.id), b.data), q)
  for (const id of plan.deleteItems) fire(deleteDoc(doc(db, 'shopping', id)), q)
  for (const id of plan.deleteProducts) fire(deleteDoc(doc(db, 'products', id)), q)
}
