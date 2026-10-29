import { cleanText, normalize } from './shopping'
import type { Product, ShoppingItem } from './types'

/** What a deleted Casa product leaves behind on the list (cart items stay: they are being bought). */
export function itemsOfProduct(productId: string, items: ShoppingItem[]): ShoppingItem[] {
  return items.filter(i => i.productId === productId && i.status === 'porComprar')
}

/** New name for a Casa product: trimmed, not blank, and not the name of another product. */
export function checkRename(product: Product, name: string, products: Product[]): { ok: string } | { error: string } {
  const clean = cleanText(name)
  if (!clean) return { error: 'Falta o nome' }
  const other = products.find(p => p.id !== product.id && normalize(p.name) === normalize(clean))
  return other ? { error: `Já existe «${other.name}»` } : { ok: clean }
}
