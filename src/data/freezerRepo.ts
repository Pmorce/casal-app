import { collection, deleteDoc, deleteField, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import { cleanText } from '../domain/shopping'
import { oldestBag, type BagOrigin, type FreezerGroup } from '../domain/freezer'
import { recordPurchase } from '../domain/rhythm'
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

/** "Descongelar": the bag goes to the fridge, from today. */
export function moveToFridge(b: FreezerBag, today: DateKey): void {
  fire(updateDoc(doc(db, 'freezerBags', b.id), { where: 'frigorifico', movedKey: today }))
}

/** "Voltar ao congelador" (and undo of "Descongelar"): only the two fields go. */
export function backToFreezer(b: FreezerBag): void {
  fire(updateDoc(doc(db, 'freezerBags', b.id), { where: deleteField(), movedKey: deleteField() }))
}

export interface FromOrigin {
  bagId: string
  /** 'comprei' only */
  purchaseId?: string
  /** 'comprei' with a product: its fields as they were, for undo */
  previous?: Pick<Product, 'id' | 'boughtKeys' | 'freezerLast'>
}

/**
 * "+" → "De onde veio?": one bag like the newest of the group, with the amount given, entered today.
 * - 'comprei' also writes a `purchases` row and the product's purchase day and last amount (quiet, on its own).
 * - 'cozinhei' makes it comida feita; the link to a bought product is dropped (it is not that product's stock).
 * - 'ofereceram' is the bag only.
 */
export function addFromOrigin(
  g: FreezerGroup, origin: BagOrigin, amount: number, today: DateKey,
  opts: { uid: string; store?: string; product?: Product },
): FromOrigin {
  if (!(amount > 0)) throw new Error('Quantidade inválida')
  const last = g.bags[g.bags.length - 1]
  const category = origin === 'cozinhei' ? 'feita' : last.category
  const ref = newBagRef()
  fire(setDoc(ref, {
    name: last.name, category, amount, unit: last.unit, addedKey: today, createdAt: serverTimestamp(),
    ...link(category === last.category ? last.productId : undefined),
  }))
  if (origin !== 'comprei') return { bagId: ref.id }
  const { product, store } = opts
  const purchase = doc(collection(db, 'purchases'))
  fire(setDoc(purchase, {
    name: product?.name ?? last.name, ...(product ? { productId: product.id } : {}), ...(store ? { store } : {}),
    dateKey: today, by: opts.uid, amount, unit: last.unit, finishId: doc(collection(db, 'purchases')).id, createdAt: serverTimestamp(),
  }))
  if (!product) return { bagId: ref.id, purchaseId: purchase.id }
  fire(updateDoc(doc(db, 'products', product.id), {
    boughtKeys: recordPurchase(product.boughtKeys, today), freezerLast: { amount, unit: last.unit, key: today },
  }), { quiet: true })
  const previous: FromOrigin['previous'] = {
    id: product.id, ...(product.boughtKeys ? { boughtKeys: product.boughtKeys } : {}), ...(product.freezerLast ? { freezerLast: product.freezerLast } : {}),
  }
  return { bagId: ref.id, purchaseId: purchase.id, previous }
}

export function undoOrigin(done: FromOrigin): void {
  deleteBag(done.bagId)
  if (done.purchaseId) fire(deleteDoc(doc(db, 'purchases', done.purchaseId)))
  const p = done.previous
  if (p) {
    fire(updateDoc(doc(db, 'products', p.id), {
      boughtKeys: p.boughtKeys ?? deleteField(), freezerLast: p.freezerLast ?? deleteField(),
    }), { quiet: true })
  }
}

export function updateBag(b: FreezerBag, changes: Partial<Pick<FreezerBag, 'amount' | 'addedKey'>>): void {
  fire(updateDoc(doc(db, 'freezerBags', b.id), changes))
}

export const deleteBag = (id: string) => fire(deleteDoc(doc(db, 'freezerBags', id)))

export interface FrozenBatch {
  bagIds: string[]
  /** each product's last amount before, so undo can put it back */
  previous: { id: string; freezerLast?: Product['freezerLast'] }[]
  /** the purchases whose amount was filled in, with what they had before */
  purchases: { id: string; amount?: number; unit?: FreezerUnit }[]
}

const setFreezerLast = (id: string, freezerLast: Product['freezerLast']) =>
  // quiet: if the product was deleted meanwhile the bags are still saved, which is what matters
  fire(updateDoc(doc(db, 'products', id), { freezerLast: freezerLast ?? deleteField() }), { quiet: true })

const setPurchaseAmount = (id: string, was: { amount?: number; unit?: FreezerUnit }) =>
  // quiet, on its own: a purchase deleted meanwhile must not take the bags down
  fire(updateDoc(doc(db, 'purchases', id), { amount: was.amount ?? deleteField(), unit: was.unit ?? deleteField() }), { quiet: true })

export interface FreezeRow {
  product: Product
  amount: number
  unit: FreezerUnit
  /** the purchase this came from: it gets the amount too */
  purchaseId?: string
  /** what that purchase had before, for undo */
  was?: { amount?: number; unit?: FreezerUnit }
}

/**
 * "Para o congelador": one bag per product, as it came from the shop, linked to it. The bags go in one batch;
 * each product's last amount is updated on its own, so a product deleted meanwhile does not take the bags down.
 */
export function freezeBought(rows: FreezeRow[], today: DateKey): FrozenBatch {
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
  const withPurchase = rows.filter((r): r is FreezeRow & { purchaseId: string } => !!r.purchaseId)
  withPurchase.forEach(r => setPurchaseAmount(r.purchaseId, { amount: r.amount, unit: r.unit }))
  return {
    bagIds: ids,
    previous: rows.map(({ product }) => ({ id: product.id, freezerLast: product.freezerLast })),
    purchases: withPurchase.map(r => ({ id: r.purchaseId, ...r.was })),
  }
}

export function undoFreeze(done: FrozenBatch): void {
  deleteBags(done.bagIds)
  done.previous.forEach(p => setFreezerLast(p.id, p.freezerLast))
  done.purchases.forEach(p => setPurchaseAmount(p.id, p))
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

export interface CookInput {
  name: string
  freezerDoses: number
  fridgeDoses: number
  madeFrom?: string
}

export interface Cooked {
  bagIds: string[]
  source?: FreezerBag
}

/**
 * "Cozinhei": up to two comida feita bags (freezer and fridge), both entered today and tied to what they were cooked from.
 * The source bag, if any, goes. A field with 0 doses makes no bag. One undo for all of it.
 */
export function cook(input: CookInput, today: DateKey, source?: FreezerBag): Cooked {
  const name = cleanText(input.name)
  if (!name) throw new Error('Nome em falta')
  const { freezerDoses, fridgeDoses } = input
  if (![freezerDoses, fridgeDoses].every(n => Number.isInteger(n) && n >= 0) || freezerDoses + fridgeDoses < 1) throw new Error('Doses inválidas')
  const made = input.madeFrom ? { madeFrom: input.madeFrom } : {}
  const make = (amount: number, extra: object) => {
    const ref = newBagRef()
    fire(setDoc(ref, { name, category: 'feita', amount, unit: 'doses', addedKey: today, createdAt: serverTimestamp(), ...made, ...extra }))
    return ref.id
  }
  const bagIds: string[] = []
  if (freezerDoses > 0) bagIds.push(make(freezerDoses, {}))
  if (fridgeDoses > 0) bagIds.push(make(fridgeDoses, { where: 'frigorifico', movedKey: today }))
  if (source) deleteBag(source.id)
  return source ? { bagIds, source } : { bagIds }
}

export function undoCook(done: Cooked): void {
  if (done.source) restoreBag(done.source)
  deleteBags(done.bagIds)
}

/** "−" on comida feita: one dose less; the last dose (or a bag in another unit) takes the bag out. Returns it for undo. */
export function useDose(b: FreezerBag): FreezerBag {
  if (b.unit === 'doses' && b.amount > 1) fire(updateDoc(doc(db, 'freezerBags', b.id), { amount: b.amount - 1 }))
  else deleteBag(b.id)
  return b
}
