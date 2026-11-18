import { formatAmount, unitLabel } from './freezer'
import { normalize } from './shopping'
import { freezerCategoryOf } from './zones'
import type { Part, Product, ShoppingItem } from './types'

const isMeat = (p: Product) => p.location === 'congelador' && freezerCategoryOf(p) === 'carne'

/** The item's product when it is Congelador meat/fish: ticking it asks "o que levas?" instead. Generic ones count too. */
export function meatProductOf(item: ShoppingItem, products: Product[]): Product | null {
  const p = item.productId ? products.find(x => x.id === item.productId) : undefined
  return p && isMeat(p) ? p : null
}

// family words: what someone writes on the list for "some meat", never a type you buy
const FAMILY = new Set(['carne', 'carnes', 'peixe', 'peixes', 'talho'])
const isType = (p: Product) => isMeat(p) && !p.generic && !FAMILY.has(normalize(p.name))

/** Types offered in the card: the item's own product first (unless generic or a family word), then the other meat, most bought first. */
export function meatTypes(own: Product, products: Product[]): Product[] {
  const others = products
    .filter(p => p.id !== own.id && isType(p))
    .sort((a, b) => (b.boughtKeys?.length ?? 0) - (a.boughtKeys?.length ?? 0) || a.name.localeCompare(b.name, 'pt-PT'))
  return isType(own) ? [own, ...others] : others
}

/** One part as it reads: "2,5 kg Vaca". */
export const partLabel = (p: Part): string => `${formatAmount(p.amount)} ${unitLabel(p.unit)} ${p.name}`

/** What is already in the cart: "3 kg Vaca · 1 kg Vazia". */
export const partsLine = (parts: Part[]): string => parts.map(partLabel).join(' · ')
