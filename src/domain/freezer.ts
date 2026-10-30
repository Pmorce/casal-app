import { daysBetween, type DateKey } from './dates'
import { normalize } from './shopping'
import { freezerCategoryOf } from './zones'
import type { FreezerBag, FreezerCategory, FreezerUnit, Product, ShoppingItem } from './types'

export interface FreezerGroup {
  key: string
  name: string
  category: FreezerCategory
  /** oldest first */
  bags: FreezerBag[]
}

export const CATEGORIES: { value: FreezerCategory; label: string }[] = [
  { value: 'carne', label: 'Carne / peixe' },
  { value: 'feita', label: 'Comida feita' },
  { value: 'outros', label: 'Outros' },
]

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

export const summary = (g: FreezerGroup): string => bagsSummary(g.bags)

export function bagsSummary(bags: FreezerBag[]): string {
  const count = bags.length
  let un = 0, grams = 0, doses = 0
  for (const b of bags) {
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

/** A product's bags: the ones linked to it, plus legacy unlinked bags with its name in its freezer tab. */
export function bagsOfProduct(p: Product, bags: FreezerBag[]): FreezerBag[] {
  const name = normalize(p.name)
  const category = freezerCategoryOf(p)
  return bags.filter(b => b.productId === p.id || (!b.productId && b.category === category && normalize(b.name) === name))
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** "Dividir": equal parts with 2 decimals; the last one takes the rounding so the total stays exact. */
export function splitAmounts(total: number, count: number): number[] {
  const part = round2(total / count)
  const parts = Array.from({ length: count - 1 }, () => part)
  return [...parts, round2(total - part * (count - 1))]
}

/** What the "Para o congelador" row starts with: the last entry, else kg for meat and units for the rest. */
export function freezeDefaults(p: Product): { amount: string; unit: FreezerUnit } {
  if (p.freezerLast) return { amount: num.format(p.freezerLast.amount).replace(/s/g, ''), unit: p.freezerLast.unit }
  return { amount: '', unit: freezerCategoryOf(p) === 'carne' ? 'kg' : 'un' }
}

/** Congelador products in the cart, once each: what "Terminar compras" offers to put in the freezer. */
export function freezerInCart(items: ShoppingItem[], products: Product[]): Product[] {
  const ids = new Set(items.filter(i => i.status === 'carrinho' && i.productId).map(i => i.productId))
  return products.filter(p => p.location === 'congelador' && ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))
}
