import { addDays, daysBetween, type DateKey } from './dates'
import type { Product } from './types'

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
  const held = (p.snoozedUntil !== undefined && p.snoozedUntil > today) || (p.snoozeCount ?? 0) >= MAX_SNOOZES
  return { gap, since, due: late && !held }
}

export function snoozeUntil(p: Product, today: DateKey): DateKey {
  const gap = typicalGap(p.boughtKeys)
  return addDays(today, Math.max(2, Math.round((gap ?? 0) / 3)))
}
