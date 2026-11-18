import { daysBetween, type DateKey } from './dates'
import { rhythmOf } from './rhythm'
import type { FreezerBag, Product, ShoppingItem, Zone } from './types'

/** Zones where stock is counted in units/packs; the freezer is known by its bags. */
export const COUNTED_ZONES: Zone[] = ['frigorifico', 'despensa', 'limpeza']

/** Counted: has a count, was not opted out ("Não contar este") and lives in a counted zone. */
export const isCounted = (p: Product): boolean =>
  p.count !== undefined && !p.uncounted && COUNTED_ZONES.includes(p.location)

/** Never shown below 0. */
export const shownCount = (p: Product): number => Math.max(0, p.count ?? 0)

/** Products still "por contar": in a counted zone, no count yet, not opted out and not generic (Casa hides those); by zone, then name. */
export function porContar(products: Product[]): Product[] {
  return products
    .filter(p => COUNTED_ZONES.includes(p.location) && p.count === undefined && !p.uncounted && !p.generic)
    .sort((a, b) =>
      COUNTED_ZONES.indexOf(a.location) - COUNTED_ZONES.indexOf(b.location) || a.name.localeCompare(b.name, 'pt-PT'))
}

/** State of a counted product; null = not counted, so the old rhythm rules apply. */
export function countState(p: Product, items: ShoppingItem[], _today: DateKey): 'falta' | 'acabou' | 'ha' | null {
  if (!isCounted(p)) return null
  if (items.some(i => i.productId === p.id)) return 'falta'
  if (p.qtyPending) return 'ha'
  return shownCount(p) === 0 ? 'acabou' : 'ha'
}

/** The count says there is stock, but it was last bought well past twice its rhythm: worth confirming. */
export function staleCount(p: Product, today: DateKey): boolean {
  if (!isCounted(p) || shownCount(p) <= 0) return false
  const { gap, since } = rhythmOf(p, today)
  return gap !== null && since !== null && since > 2 * gap
}

export const inFreezer = (bags: FreezerBag[]): FreezerBag[] => bags.filter(b => b.where === undefined)

const fridgeKey = (b: FreezerBag): DateKey => b.movedKey ?? b.addedKey

/** Bags thawing in the fridge, oldest first. */
export const inFridge = (bags: FreezerBag[]): FreezerBag[] =>
  bags.filter(b => b.where === 'frigorifico').sort((a, b) => fridgeKey(a).localeCompare(fridgeKey(b)))

/** From this many days in the fridge a bag asks to be eaten. */
export const FRIDGE_WARN_DAYS = 3

export const fridgeDays = (bag: FreezerBag, today: DateKey): number => daysBetween(fridgeKey(bag), today)
