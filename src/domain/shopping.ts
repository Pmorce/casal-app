import { rhythmOf } from './rhythm'
import type { DateKey } from './dates'
import type { Product, ShoppingItem } from './types'

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function cleanText(s: string): string | null {
  const t = s.trim().replace(/\s+/g, ' ')
  return t ? t : null
}

export function findProduct(text: string, products: Product[]): Product | undefined {
  const key = normalize(text)
  return products.find(p => normalize(p.name) === key)
}

export function isOnList(text: string, items: ShoppingItem[]): boolean {
  const key = normalize(text)
  return items.some(i => normalize(i.text) === key)
}

/** Products deleted meanwhile are skipped: updating a missing doc would make the server reject the whole batch. */
export function finishShopping(items: ShoppingItem[], products: Product[]): { deleteIds: string[]; productIdsBought: string[] } {
  const existing = new Set(products.map(p => p.id))
  const inCart = items.filter(i => i.status === 'carrinho')
  return {
    deleteIds: inCart.map(i => i.id),
    productIdsBought: inCart.flatMap(i => (i.productId && existing.has(i.productId) ? [i.productId] : [])),
  }
}

/** Names whose purchase "Terminar compras" will really record in Casa — the note must not promise more. */
export function backToCasa(items: ShoppingItem[], products: Product[]): string[] {
  const existing = new Set(products.map(p => p.id))
  return items.filter(i => i.status === 'carrinho' && i.productId && existing.has(i.productId)).map(i => i.text)
}

/** "Talvez falte": products past their usual rhythm that are not on the list yet, most overdue first. */
export function maybeMissing(products: Product[], items: ShoppingItem[], today: DateKey): { product: Product; gap: number; since: number }[] {
  const listed = new Set(items.flatMap(i => (i.productId ? [i.productId] : [])))
  return products
    .filter(p => !listed.has(p.id))
    .flatMap(p => {
      const r = rhythmOf(p, today)
      return r.due && r.gap !== null && r.since !== null ? [{ product: p, gap: r.gap, since: r.since }] : []
    })
    .sort((a, b) => b.since / b.gap - a.since / a.gap)
}
