import { addDoc, collection, deleteDoc, deleteField, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import { cleanText, findProduct, isOnList, normalize } from '../domain/shopping'
import { restoreTrip } from './tripRepo'
import type { FinishPlan } from '../domain/finish'
import { itemsOfProduct } from '../domain/pantry'
import { recordPurchase, snoozeUntil } from '../domain/rhythm'
import type { DateKey } from '../domain/dates'
import type { FreezerBag, Part, Product, ShoppingItem, Trip, Zone } from '../domain/types'

/**
 * A known product name goes straight on the list. A new name returns 'needsZone' without writing:
 * the screen asks where it lives (once) and calls again with the zone, or 'oneOff' for "só desta vez".
 */
export function addItem(
  text: string,
  uid: string,
  products: Product[],
  items: ShoppingItem[],
  zone?: Zone | 'oneOff',
): 'added' | 'duplicate' | 'empty' | 'needsZone' {
  const clean = cleanText(text)
  if (!clean) return 'empty'
  if (isOnList(clean, items)) return 'duplicate'
  const base = { text: clean, addedBy: uid, status: 'porComprar', createdAt: serverTimestamp() }
  const known = findProduct(clean, products)
  if (known) {
    fire(addDoc(collection(db, 'shopping'), { ...base, productId: known.id }))
  } else if (zone === 'oneOff') {
    fire(addDoc(collection(db, 'shopping'), { ...base, oneOff: true }))
  } else if (zone) {
    const batch = writeBatch(db)
    const product = doc(collection(db, 'products'))
    batch.set(product, { name: clean, location: zone })
    batch.set(doc(collection(db, 'shopping')), { ...base, productId: product.id })
    fire(batch.commit())
  } else {
    return 'needsZone'
  }
  return 'added'
}

/** "Sem zona" item (legacy or unforeseen): link it to a product of that name, create one in the zone, or mark it one-off. */
export function classifyItem(item: ShoppingItem, zone: Zone | 'oneOff', products: Product[]): void {
  const known = findProduct(item.text, products)
  if (known) return fire(updateDoc(doc(db, 'shopping', item.id), { productId: known.id }))
  if (zone === 'oneOff') return fire(updateDoc(doc(db, 'shopping', item.id), { oneOff: true }))
  const batch = writeBatch(db)
  const product = doc(collection(db, 'products'))
  batch.set(product, { name: item.text, location: zone })
  batch.update(doc(db, 'shopping', item.id), { productId: product.id })
  fire(batch.commit())
}

/**
 * "Falta": straight onto the list, unless it is already there — linked, or as a loose item with the same name
 * (old, "sem zona" or "só desta vez"), which then gets linked instead of duplicated.
 */
export function markMissing(p: Product, uid: string, items: ShoppingItem[]): void {
  if (items.some(i => i.productId === p.id)) return
  const loose = items.find(i => !i.productId && normalize(i.text) === normalize(p.name))
  if (loose) return fire(updateDoc(doc(db, 'shopping', loose.id), { productId: p.id, oneOff: deleteField(), text: p.name }))
  fire(addDoc(collection(db, 'shopping'), { text: p.name, addedBy: uid, status: 'porComprar', productId: p.id, createdAt: serverTimestamp() }))
}

/** "Ainda há": hide the suggestion for a while; after a few in a row it stops (see MAX_SNOOZES). */
export function snooze(p: Product, today: DateKey): void {
  fire(updateDoc(doc(db, 'products', p.id), { snoozedUntil: snoozeUntil(p, today), snoozeCount: (p.snoozeCount ?? 0) + 1 }))
}

/** Ticking takes the store of the trip (no field without one); unticking drops it again. */
export function toggleCart(item: ShoppingItem, store?: string): void {
  const data = item.status === 'carrinho'
    ? { status: 'porComprar', store: deleteField() }
    : { status: 'carrinho', ...(store ? { store } : {}) }
  fire(updateDoc(doc(db, 'shopping', item.id), data))
}

/**
 * Meat card: each "Pôr no carrinho" adds a part (with its own id) and ticks the item. The whole array is rewritten:
 * both phones rarely add parts to the same item at once. No store field without a trip (Firestore has no undefined).
 */
export function addPart(item: ShoppingItem, part: Omit<Part, 'id'>): void {
  const { store, ...rest } = part
  const added: Part = { id: doc(collection(db, 'shopping')).id, ...rest, ...(store ? { store } : {}) }
  fire(updateDoc(doc(db, 'shopping', item.id), { parts: [...(item.parts ?? []), added], status: 'carrinho' }))
}

/** ✕ on a part; without parts left the item is no longer in the cart. */
export function removePart(item: ShoppingItem, partId: string): void {
  const left = (item.parts ?? []).filter(p => p.id !== partId)
  fire(updateDoc(doc(db, 'shopping', item.id), left.length ? { parts: left } : { status: 'porComprar', parts: deleteField() }))
}

/** "Tirar tudo do carrinho". */
export const clearParts = (item: ShoppingItem): void =>
  fire(updateDoc(doc(db, 'shopping', item.id), { status: 'porComprar', parts: deleteField() }))

/**
 * "+ outro" in the meat card: the product of that name, else a new Congelador meat product, created now
 * (so undoing "Terminar" never has to delete products). Its id is known at once, before the server answers.
 */
export function ensureMeatProduct(name: string, products: Product[]): { id: string; name: string } {
  const clean = cleanText(name) ?? name
  const known = findProduct(clean, products)
  if (known) return { id: known.id, name: known.name }
  const ref = doc(collection(db, 'products'))
  fire(setDoc(ref, { name: clean, location: 'congelador', freezerCategory: 'carne' }))
  return { id: ref.id, name: clean }
}

/**
 * Product updates go one by one, outside the batch that clears the list: if the other phone deleted the
 * product meanwhile, only that update fails instead of the server rejecting (and rolling back) everything.
 */
const updateProduct = (id: string, data: Record<string, unknown>) => fire(updateDoc(doc(db, 'products', id), data))

type RhythmFields = Pick<Product, 'id' | 'boughtKeys' | 'snoozedUntil' | 'snoozeCount'>
const rhythmFields = (p: Product): RhythmFields => ({ id: p.id, boughtKeys: p.boughtKeys, snoozedUntil: p.snoozedUntil, snoozeCount: p.snoozeCount })
const purchased = (p: Product, today: DateKey) => ({ boughtKeys: recordPurchase(p.boughtKeys, today), snoozedUntil: deleteField(), snoozeCount: deleteField() })
/** Firestore has no undefined: a field that was missing is deleted again. */
const restoreRhythm = ({ boughtKeys, snoozedUntil, snoozeCount }: RhythmFields) => ({
  boughtKeys: boughtKeys ?? deleteField(),
  snoozedUntil: snoozedUntil ?? deleteField(),
  snoozeCount: snoozeCount ?? deleteField(),
})

export interface FinishedShopping {
  items: ShoppingItem[]
  /** bought products, with their rhythm fields as they were before */
  products: RhythmFields[]
  /** groups the purchases of this "Terminar" */
  finishId: string
  /** purchase key (part or item id) → purchase doc id */
  purchaseIds: Record<string, string>
  /** products this "Terminar" made generic */
  generic: string[]
  /** the trip it ended, to bring back on undo */
  trip: Trip | null
}

/**
 * "Terminar compras": one batch drops the cart, writes the purchases and ends the trip; then each bought product
 * records today and each "Carne" that only held other types turns generic. Returns what undo needs.
 */
export function finish(items: ShoppingItem[], products: Product[], plan: FinishPlan, today: DateKey, trip: Trip | null): FinishedShopping {
  const bought = products.filter(p => plan.boughtIds.includes(p.id))
  const generic = plan.makeGeneric.filter(id => products.some(p => p.id === id))
  const finishId = doc(collection(db, 'purchases')).id
  const purchaseIds: Record<string, string> = {}
  const batch = writeBatch(db)
  plan.deleteIds.forEach(id => batch.delete(doc(db, 'shopping', id)))
  for (const { key, row } of plan.purchases) {
    const ref = doc(collection(db, 'purchases'))
    purchaseIds[key] = ref.id
    batch.set(ref, { ...row, finishId, createdAt: serverTimestamp() })
  }
  if (trip) batch.delete(doc(db, 'meta', 'trip'))
  fire(batch.commit())
  bought.forEach(p => updateProduct(p.id, purchased(p, today)))
  generic.forEach(id => updateProduct(id, { generic: true }))
  return {
    items: items.filter(i => plan.deleteIds.includes(i.id)),
    products: bought.map(rhythmFields),
    finishId,
    purchaseIds,
    generic,
    trip,
  }
}

export function undoFinish(done: FinishedShopping): void {
  const batch = writeBatch(db)
  for (const { id, ...data } of done.items) batch.set(doc(db, 'shopping', id), data)
  Object.values(done.purchaseIds).forEach(id => batch.delete(doc(db, 'purchases', id)))
  fire(batch.commit())
  done.products.forEach(p => updateProduct(p.id, restoreRhythm(p)))
  done.generic.forEach(id => updateProduct(id, { generic: deleteField() }))
  if (done.trip) restoreTrip(done.trip)
}

export interface BoughtSnapshot {
  product: Product
  items: ShoppingItem[]
}

/** "Comprei": a purchase made outside the app (milk on the way home), so the rhythm stays right. */
export function boughtOutside(p: Product, items: ShoppingItem[], today: DateKey): BoughtSnapshot {
  const pending = itemsOfProduct(p.id, items)
  updateProduct(p.id, purchased(p, today))
  if (pending.length) {
    const batch = writeBatch(db)
    pending.forEach(i => batch.delete(doc(db, 'shopping', i.id)))
    fire(batch.commit())
  }
  return { product: p, items: pending }
}

export function undoBought(s: BoughtSnapshot): void {
  updateProduct(s.product.id, restoreRhythm(s.product))
  for (const { id, ...data } of s.items) fire(setDoc(doc(db, 'shopping', id), data))
}

export function addProduct(name: string, location: Zone, products: Product[]): 'added' | 'duplicate' | 'empty' {
  const clean = cleanText(name)
  if (!clean) return 'empty'
  if (products.some(p => normalize(p.name) === normalize(clean))) return 'duplicate'
  fire(addDoc(collection(db, 'products'), { name: clean, location }))
  return 'added'
}

export const deleteItem = (id: string) => fire(deleteDoc(doc(db, 'shopping', id)))

/**
 * Rename keeps the list and the freezer in step: items and bags linked to the product show the new name.
 * No batch: a bag or item the other phone removed would make the server reject it all and undo the rename.
 * Only the product write is loud; the rest are quiet, and the background tidy-up repairs any that fail.
 */
export function renameProduct(p: Product, name: string, items: ShoppingItem[], bags: FreezerBag[]): void {
  fire(updateDoc(doc(db, 'products', p.id), { name }))
  items.filter(i => i.productId === p.id).forEach(i => fire(updateDoc(doc(db, 'shopping', i.id), { text: name }), { quiet: true }))
  bags.filter(b => b.productId === p.id).forEach(b => fire(updateDoc(doc(db, 'freezerBags', b.id), { name }), { quiet: true }))
}

export const setFreezerCategory = (p: Product, freezerCategory: 'carne' | 'outros') =>
  fire(updateDoc(doc(db, 'products', p.id), { freezerCategory }))

export const moveProduct = (p: Product, location: Zone) => fire(updateDoc(doc(db, 'products', p.id), { location }))

/** Deletes the product and the item it left on the list; returns both so the UI can undo. */
export function deleteProduct(p: Product, items: ShoppingItem[]): { product: Product; items: ShoppingItem[] } {
  const linked = itemsOfProduct(p.id, items)
  const batch = writeBatch(db)
  batch.delete(doc(db, 'products', p.id))
  linked.forEach(i => batch.delete(doc(db, 'shopping', i.id)))
  fire(batch.commit())
  return { product: p, items: linked }
}
