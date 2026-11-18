import { formatAmount, unitLabel } from './freezer'
import { freezerCategoryOf } from './zones'
import type { Part, Product, ShoppingItem } from './types'

const isMeat = (p: Product) => p.location === 'congelador' && freezerCategoryOf(p) === 'carne'

/** The item's product when it is Congelador meat/fish: ticking it asks "o que levas?" instead. Generic ones count too. */
export function meatProductOf(item: ShoppingItem, products: Product[]): Product | null {
  const p = item.productId ? products.find(x => x.id === item.productId) : undefined
  return p && isMeat(p) ? p : null
}

/** Types offered in the card: the item's own product first (unless generic), then the other meat, most bought first. */
export function meatTypes(own: Product, products: Product[]): Product[] {
  const others = products
    .filter(p => p.id !== own.id && isMeat(p) && !p.generic)
    .sort((a, b) => (b.boughtKeys?.length ?? 0) - (a.boughtKeys?.length ?? 0) || a.name.localeCompare(b.name, 'pt-PT'))
  return own.generic ? others : [own, ...others]
}

/** One part as it reads: "2,5 kg Vaca". */
export const partLabel = (p: Part): string => `${formatAmount(p.amount)} ${unitLabel(p.unit)} ${p.name}`

/** What is already in the cart: "3 kg Vaca · 1 kg Vazia". */
export const partsLine = (parts: Part[]): string => parts.map(partLabel).join(' · ')
