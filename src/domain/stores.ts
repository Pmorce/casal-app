import type { DateKey } from './dates'
import { normalize } from './shopping'
import type { Purchase, Trip } from './types'

export const STORES: readonly string[] = [
  'Continente', 'Pingo Doce', 'Mercadona', 'Lidl', 'Aldi', 'Intermarché', 'Minipreço', 'Auchan',
]

const tripDoc = (meta: { id: string }[]): Trip | null =>
  (meta.find(m => m.id === 'trip') as Trip | undefined) ?? null

/** The trip started today; one from an earlier day counts as no trip. */
export function activeTrip(meta: { id: string }[], today: DateKey): Trip | null {
  const t = tripDoc(meta)
  return t && t.dateKey === today ? t : null
}

export function customStores(meta: { id: string }[]): string[] {
  const d = meta.find(m => m.id === 'stores') as { custom?: string[] } | undefined
  return d?.custom ?? []
}

/** Fixed + custom stores, deduplicated, most used first, ties alphabetical. */
export function storeOptions(custom: string[], purchases: Purchase[]): string[] {
  const seen = new Set<string>()
  const all: string[] = []
  for (const s of [...STORES, ...custom]) {
    const k = normalize(s)
    if (seen.has(k)) continue
    seen.add(k)
    all.push(s)
  }
  const count = (s: string) => purchases.filter(p => p.store && normalize(p.store) === normalize(s)).length
  return all.sort((a, b) => count(b) - count(a) || a.localeCompare(b, 'pt-PT'))
}
