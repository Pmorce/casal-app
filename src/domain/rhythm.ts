import { addDays, daysBetween, type DateKey } from './dates'
import { bagsOfProduct } from './freezer'
import type { FreezerBag, Product, ShoppingItem } from './types'

const KEEP = 8
/** after this many "Ainda há" with no purchase, stop suggesting until the next purchase */
export const MAX_SNOOZES = 3

export function recordPurchase(boughtKeys: DateKey[] | undefined, day: DateKey): DateKey[] {
  return [...new Set([...(boughtKeys ?? []), day])].sort().slice(-KEEP)
}

/** Median days between purchases; null until bought twice. */
export function typicalGap(boughtKeys: DateKey[] | undefined): number | null {
  const keys = boughtKeys ?? []
  if (keys.length < 2) return null
  const gaps = keys.slice(1).map((k, i) => daysBetween(keys[i], k)).sort((a, b) => a - b)
  const mid = Math.floor(gaps.length / 2)
  return gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2
}

/**
 * Conservative on purpose (better few, right suggestions): due once 20% past the usual gap and at
 * least 2 days late; with a single known gap, 50% past.
 */
export function rhythmOf(p: Product, today: DateKey): { gap: number | null; since: number | null; due: boolean } {
  const keys = p.boughtKeys ?? []
  const gap = typicalGap(keys)
  const since = keys.length ? daysBetween(keys[keys.length - 1], today) : null
  if (gap === null || since === null) return { gap, since, due: false }
  const margin = keys.length === 2 ? 1.5 : 1.2
  const late = since >= Math.max(gap * margin, gap + 2)
  return { gap, since, due: late && !isHeld(p, today) }
}

/** "Ainda há" said recently, or too many times since the last purchase. */
export function isHeld(p: Product, today: DateKey): boolean {
  return (p.snoozedUntil !== undefined && p.snoozedUntil > today) || (p.snoozeCount ?? 0) >= MAX_SNOOZES
}

/**
 * Congelador products are known by their bags, not guessed by rhythm: none left means probably out —
 * but only for products the app has seen bought (few, right suggestions).
 */
export function freezerDue(p: Product, bags: FreezerBag[], today: DateKey): boolean {
  const last = p.boughtKeys?.[p.boughtKeys.length - 1]
  if (p.location !== 'congelador' || last === undefined) return false
  // bought today: its bags may still be on their way in (the "Para o congelador" card)
  if (last >= today) return false
  // the bags of the last purchase were never entered ("Agora não"): no bags tells nothing
  if (!p.freezerLast?.key || p.freezerLast.key < last) return false
  return !bagsOfProduct(p, bags).length && !isHeld(p, today)
}

/** For display only (the due rule keeps the exact median): "~8 dias", never "~7.5". */
export const shownGap = (gap: number): number => Math.round(gap)

export function snoozeUntil(p: Product, today: DateKey): DateKey {
  const gap = typicalGap(p.boughtKeys)
  return addDays(today, gap === null ? 7 : Math.max(2, Math.round(gap / 3)))
}

/** What Casa shows at a glance, without counting stock: on the list, probably out (past its rhythm), or there. */
export type StockStatus = 'falta' | 'talvez' | 'ha'

export function stockStatus(p: Product, items: ShoppingItem[], today: DateKey, bags: FreezerBag[]): StockStatus {
  if (items.some(i => i.productId === p.id)) return 'falta'
  const due = p.location === 'congelador' ? freezerDue(p, bags, today) : rhythmOf(p, today).due
  return due ? 'talvez' : 'ha'
}
