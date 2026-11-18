import { freezerDue, rhythmOf } from './rhythm'
import type { DateKey } from './dates'
import type { FreezerBag, Product, ShoppingItem } from './types'

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

export type MaybeMissing =
  | { product: Product; reason: 'ritmo'; gap: number; since: number }
  | { product: Product; reason: 'congelador' }

/**
 * "Talvez falte", not on the list yet: Congelador products with no bags left first (counted, so surer),
 * then products past their usual rhythm, most overdue first.
 */
export function maybeMissing(products: Product[], items: ShoppingItem[], today: DateKey, bags: FreezerBag[]): MaybeMissing[] {
  const listed = new Set(items.flatMap(i => (i.productId ? [i.productId] : [])))
  const open = products.filter(p => !listed.has(p.id))
  const frozen: MaybeMissing[] = open
    .filter(p => freezerDue(p, bags, today))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))
    .map(product => ({ product, reason: 'congelador' }))
  const late = open
    .filter(p => p.location !== 'congelador')
    .flatMap(p => {
      const r = rhythmOf(p, today)
      return r.due && r.gap !== null && r.since !== null ? [{ product: p, reason: 'ritmo' as const, gap: r.gap, since: r.since }] : []
    })
    .sort((a, b) => b.since / b.gap - a.since / a.gap)
  return [...frozen, ...late]
}
