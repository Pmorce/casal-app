import { cleanText, normalize } from './shopping'
import type { Product, ProductState, ShoppingItem, ShortageReason } from './types'

export type PantryAction =
  | { type: 'addItem'; text: string; productId: string; reason: ShortageReason }
  | { type: 'setReason'; itemId: string; productId: string; reason: ShortageReason }
  | { type: 'removeItem'; itemId: string }

export function onProductStateChange(product: Product, next: ProductState, items: ShoppingItem[]): PantryAction[] {
  const name = normalize(product.name)
  const linked = items.find(i => i.productId === product.id)
    ?? items.find(i => !i.productId && normalize(i.text) === name)
  if (next === 'ha') {
    return linked && linked.status === 'porComprar' ? [{ type: 'removeItem', itemId: linked.id }] : []
  }
  if (linked) return [{ type: 'setReason', itemId: linked.id, productId: product.id, reason: next }]
  return [{ type: 'addItem', text: product.name, productId: product.id, reason: next }]
}

/** What a deleted Casa product leaves behind on the list (cart items stay: they are being bought). */
export function itemsOfProduct(productId: string, items: ShoppingItem[]): ShoppingItem[] {
  return items.filter(i => i.productId === productId && i.status === 'porComprar')
}

/** Tapping the current state is a no-op, except "a acabar"/"acabou" when the item was taken off the list: then it goes back. */
export function needsSync(product: Product, next: ProductState, items: ShoppingItem[]): boolean {
  if (product.state !== next) return true
  return next !== 'ha' && !items.some(i => i.productId === product.id)
}

/** New name for a Casa product: trimmed, not blank, and not the name of another product. */
export function checkRename(product: Product, name: string, products: Product[]): { ok: string } | { error: string } {
  const clean = cleanText(name)
  if (!clean) return { error: 'Falta o nome' }
  const other = products.find(p => p.id !== product.id && normalize(p.name) === normalize(clean))
  return other ? { error: `Já existe «${other.name}»` } : { ok: clean }
}
