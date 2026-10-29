import { findProduct } from './shopping'
import type { Product, ShoppingItem } from './types'

/**
 * One-off move to the rhythm model: products lose the old há/a acabar/acabou `state`, list items lose
 * `reason`, and handwritten items whose name matches a product get linked to it (the rest stay "Sem zona").
 */
export function planMigration(
  products: (Product & { state?: unknown })[],
  items: (ShoppingItem & { reason?: unknown })[],
): { productIdsDropState: string[]; itemsDropReason: string[]; itemLinks: { itemId: string; productId: string }[] } {
  return {
    productIdsDropState: products.filter(p => p.state !== undefined).map(p => p.id),
    itemsDropReason: items.filter(i => i.reason !== undefined).map(i => i.id),
    itemLinks: items.flatMap(i => {
      if (i.productId || i.oneOff) return []
      const p = findProduct(i.text, products)
      return p ? [{ itemId: i.id, productId: p.id }] : []
    }),
  }
}
