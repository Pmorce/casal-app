import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import { cleanText, findProduct, finishShopping, isOnList, normalize } from '../domain/shopping'
import { itemsOfProduct, onProductStateChange } from '../domain/pantry'
import type { Product, ProductState, ShoppingItem, ShortageReason } from '../domain/types'

export function addItem(
  text: string,
  uid: string,
  products: Product[],
  items: ShoppingItem[],
  opts: { productId?: string; reason?: ShortageReason } = {},
): 'added' | 'duplicate' | 'empty' {
  const clean = cleanText(text)
  if (!clean) return 'empty'
  if (isOnList(clean, items)) return 'duplicate'
  const productId = opts.productId ?? findProduct(clean, products)?.id
  fire(addDoc(collection(db, 'shopping'), {
    text: clean,
    addedBy: uid,
    status: 'porComprar',
    createdAt: serverTimestamp(),
    ...(productId ? { productId } : {}),
    ...(opts.reason ? { reason: opts.reason } : {}),
  }))
  return 'added'
}

export function toggleCart(item: ShoppingItem): void {
  fire(updateDoc(doc(db, 'shopping', item.id), { status: item.status === 'carrinho' ? 'porComprar' : 'carrinho' }))
}

export interface FinishedShopping {
  items: ShoppingItem[]
  /** products set to "há", with the state they had before */
  products: Pick<Product, 'id' | 'state'>[]
}

/** "Terminar compras": drop everything in the cart and mark linked products as "há". Returns what undo needs. */
export function finish(items: ShoppingItem[], products: Product[]): FinishedShopping {
  const { deleteIds, productIdsToHa } = finishShopping(items, products)
  const batch = writeBatch(db)
  deleteIds.forEach(id => batch.delete(doc(db, 'shopping', id)))
  productIdsToHa.forEach(id => batch.update(doc(db, 'products', id), { state: 'ha' }))
  fire(batch.commit())
  return {
    items: items.filter(i => deleteIds.includes(i.id)),
    products: products.filter(p => productIdsToHa.includes(p.id)).map(p => ({ id: p.id, state: p.state })),
  }
}

export function undoFinish(done: FinishedShopping): void {
  const batch = writeBatch(db)
  for (const { id, ...data } of done.items) batch.set(doc(db, 'shopping', id), data)
  for (const p of done.products) batch.update(doc(db, 'products', p.id), { state: p.state })
  fire(batch.commit())
}

export function setProductState(p: Product, next: ProductState, items: ShoppingItem[], uid: string): void {
  const batch = writeBatch(db)
  batch.update(doc(db, 'products', p.id), { state: next })
  for (const a of onProductStateChange(p, next, items)) {
    if (a.type === 'addItem') {
      batch.set(doc(collection(db, 'shopping')), {
        text: a.text, addedBy: uid, status: 'porComprar', productId: a.productId, reason: a.reason, createdAt: serverTimestamp(),
      })
    } else if (a.type === 'setReason') {
      batch.update(doc(db, 'shopping', a.itemId), { reason: a.reason, productId: a.productId })
    } else {
      batch.delete(doc(db, 'shopping', a.itemId))
    }
  }
  fire(batch.commit())
}

export function addProduct(name: string, location: Product['location'], products: Product[]): 'added' | 'duplicate' | 'empty' {
  const clean = cleanText(name)
  if (!clean) return 'empty'
  if (products.some(p => normalize(p.name) === normalize(clean))) return 'duplicate'
  fire(addDoc(collection(db, 'products'), { name: clean, location, state: 'ha' }))
  return 'added'
}

export const deleteItem = (id: string) => fire(deleteDoc(doc(db, 'shopping', id)))

/** Rename keeps the list in step: items linked to the product show the new name. */
export function renameProduct(p: Product, name: string, items: ShoppingItem[]): void {
  const batch = writeBatch(db)
  batch.update(doc(db, 'products', p.id), { name })
  items.filter(i => i.productId === p.id).forEach(i => batch.update(doc(db, 'shopping', i.id), { text: name }))
  fire(batch.commit())
}

export const moveProduct = (p: Product, location: Product['location']) => fire(updateDoc(doc(db, 'products', p.id), { location }))

/** Deletes the product and the item it left on the list; returns both so the UI can undo. */
export function deleteProduct(p: Product, items: ShoppingItem[]): { product: Product; items: ShoppingItem[] } {
  const linked = itemsOfProduct(p.id, items)
  const batch = writeBatch(db)
  batch.delete(doc(db, 'products', p.id))
  linked.forEach(i => batch.delete(doc(db, 'shopping', i.id)))
  fire(batch.commit())
  return { product: p, items: linked }
}
