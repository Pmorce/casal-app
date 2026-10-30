import { collection, deleteDoc, deleteField, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import { cleanText } from '../domain/shopping'
import { oldestBag, type FreezerGroup } from '../domain/freezer'
import { freezerCategoryOf } from '../domain/zones'
import type { DateKey } from '../domain/dates'
import type { FreezerBag, FreezerUnit, Product } from '../domain/types'

export interface NewBags {
  name: string
  category: FreezerBag['category']
  amount: number
  unit: FreezerBag['unit']
  count: number
  productId?: string
}

/** Firestore has no undefined: the link is written only when there is one. */
const link = (productId?: string) => (productId ? { productId } : {})
const newBagRef = () => doc(collection(db, 'freezerBags'))

/** Throws on invalid input; otherwise writes in the background. */
export function addBags(input: NewBags, today: DateKey): void {
  const name = cleanText(input.name)
  if (!name) throw new Error('Nome em falta')
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 20) throw new Error('Nº de sacos inválido')
  if (!(input.amount > 0)) throw new Error('Quantidade inválida')
  const batch = writeBatch(db)
  for (let i = 0; i < input.count; i++) {
    batch.set(newBagRef(), {
      name, category: input.category, amount: input.amount, unit: input.unit, addedKey: today, createdAt: serverTimestamp(), ...link(input.productId),
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
  addBags({ name: last.name, category: last.category, amount: last.amount, unit: last.unit, count: 1, productId: last.productId }, today)
}

export function updateBag(b: FreezerBag, changes: Partial<Pick<FreezerBag, 'amount' | 'addedKey'>>): void {
  fire(updateDoc(doc(db, 'freezerBags', b.id), changes))
}

export const deleteBag = (id: string) => fire(deleteDoc(doc(db, 'freezerBags', id)))

export interface FrozenBatch {
  bagIds: string[]
  /** each product's last amount before, so undo can put it back */
  previous: { id: string; freezerLast?: Product['freezerLast'] }[]
}

const setFreezerLast = (id: string, freezerLast: Product['freezerLast']) =>
  // quiet: if the product was deleted meanwhile the bags are still saved, which is what matters
  fire(updateDoc(doc(db, 'products', id), { freezerLast: freezerLast ?? deleteField() }), { quiet: true })

/**
 * "Para o congelador": one bag per product, as it came from the shop, linked to it. The bags go in one batch;
 * each product's last amount is updated on its own, so a product deleted meanwhile does not take the bags down.
 */
export function freezeBought(rows: { product: Product; amount: number; unit: FreezerUnit }[], today: DateKey): FrozenBatch {
  const batch = writeBatch(db)
  const ids = rows.map(({ product, amount, unit }) => {
    const ref = newBagRef()
    batch.set(ref, {
      name: product.name, category: freezerCategoryOf(product), amount, unit, addedKey: today, productId: product.id, createdAt: serverTimestamp(),
    })
    return ref.id
  })
  fire(batch.commit())
  rows.forEach(({ product, amount, unit }) => setFreezerLast(product.id, { amount, unit, key: today }))
  return { bagIds: ids, previous: rows.map(({ product }) => ({ id: product.id, freezerLast: product.freezerLast })) }
}

export function undoFreeze(done: FrozenBatch): void {
  deleteBags(done.bagIds)
  done.previous.forEach(p => setFreezerLast(p.id, p.freezerLast))
}

/** "Dividir": the bag becomes one bag per amount, same entry date, tab and link. Returns the new ids for undo. */
export function splitBag(b: FreezerBag, amounts: number[]): string[] {
  if (amounts.length < 2 || amounts.length > 20) throw new Error('Nº de sacos inválido')
  if (amounts.some(a => !(a > 0))) throw new Error('Quantidade inválida')
  const batch = writeBatch(db)
  // fails the whole batch if the other phone already took this bag out: otherwise the split would bring it back
  batch.update(doc(db, 'freezerBags', b.id), { splitAt: serverTimestamp() })
  batch.delete(doc(db, 'freezerBags', b.id))
  const ids = amounts.map(amount => {
    const ref = newBagRef()
    batch.set(ref, {
      name: b.name, category: b.category, amount, unit: b.unit, addedKey: b.addedKey, createdAt: serverTimestamp(), ...link(b.productId),
    })
    return ref.id
  })
  fire(batch.commit())
  return ids
}

export function deleteBags(ids: string[]): void {
  if (!ids.length) return
  const batch = writeBatch(db)
  ids.forEach(id => batch.delete(doc(db, 'freezerBags', id)))
  fire(batch.commit())
}
