import { daysBetween, type DateKey } from './dates'
import { normalize } from './shopping'
import type { FreezerBag, FreezerCategory } from './types'

export interface FreezerGroup {
  key: string
  name: string
  category: FreezerCategory
  /** oldest first */
  bags: FreezerBag[]
}

const OLD_AFTER_DAYS = 90
const num = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 })

export function parseAmount(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  const n = Number(t)
  return n > 0 ? n : null
}

export function groupBags(bags: FreezerBag[]): FreezerGroup[] {
  const map = new Map<string, FreezerGroup>()
  for (const b of bags) {
    const key = `${b.category}:${normalize(b.name)}`
    let g = map.get(key)
    if (!g) map.set(key, (g = { key, name: b.name.trim(), category: b.category, bags: [] }))
    g.bags.push(b)
  }
  const groups = [...map.values()]
  for (const g of groups) g.bags.sort((a, b) => a.addedKey.localeCompare(b.addedKey))
  return groups.sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))
}

export function summary(g: FreezerGroup): string {
  const count = g.bags.length
  let un = 0, grams = 0, doses = 0
  for (const b of g.bags) {
    if (b.unit === 'un') un += b.amount
    else if (b.unit === 'g') grams += b.amount
    else if (b.unit === 'kg') grams += b.amount * 1000
    else doses += b.amount
  }
  const parts: string[] = []
  if (un) parts.push(`${num.format(un)} un.`)
  if (grams) parts.push(grams >= 1000 ? `${num.format(grams / 1000)} kg` : `${num.format(grams)} g`)
  if (doses) parts.push(`${num.format(doses)} ${doses === 1 ? 'dose' : 'doses'}`)
  return `${count} ${count === 1 ? 'saco' : 'sacos'} · ${parts.join(' + ')}`
}

export function oldestBag(g: FreezerGroup): FreezerBag {
  return g.bags[0]
}

export function isOld(bag: FreezerBag, today: DateKey): boolean {
  return daysBetween(bag.addedKey, today) > OLD_AFTER_DAYS
}
