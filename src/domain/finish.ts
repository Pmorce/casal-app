import { findProduct } from './shopping'
import { isCounted } from './stock'
import type { DateKey } from './dates'
import type { FreezerUnit, Part, Product, Purchase, ShoppingItem, Trip } from './types'

export interface FinishPlan {
  deleteIds: string[]
  /** products whose boughtKeys get today: parts' products and plain linked items, once each; never one turning generic */
  boughtIds: string[]
  /** item products none of whose parts is themselves ("Carne" → vaca + vazia); already generic ones are left alone */
  makeGeneric: string[]
  /** key = part.id or item.id */
  purchases: { key: string; row: Omit<Purchase, 'id' | 'finishId'> }[]
  /** one "Quanto foi?" each: trip stores first (in trip order), then other stores as they appear, then null if something has none */
  stores: (string | null)[]
  /** one per part (pre-filled) + one per other Congelador product */
  freezer: { key: string; productId: string; amount?: number; unit?: FreezerUnit }[]
  /** counted products with a usual quantity: count += qty; their purchase row (key) says `qty un` */
  counted: { productId: string; qty: number; key: string }[]
  /** counted products without a usual quantity: asked in "O que entrou" */
  entrada: { productId: string; key: string }[]
}

const inCart = (items: ShoppingItem[]) => items.filter(i => i.status === 'carrinho')
const hasParts = (i: ShoppingItem): i is ShoppingItem & { parts: Part[] } => !!i.parts?.length

/** "Onde foi?" is asked only without a trip, when something in the cart (or one of its parts) has no store. */
export function needsStoreQuestion(items: ShoppingItem[], trip: Trip | null): boolean {
  if (trip) return false
  return inCart(items).some(i => (hasParts(i) ? i.parts.some(p => !p.store) : !i.store))
}

/**
 * What "Terminar compras" writes. The truth about where things were bought is the store saved on each tick or part;
 * without one it is the trip's current store, else the answer to "Onde foi?". Firestore has no undefined, so
 * missing fields are left out of the rows.
 */
export function planFinish(
  items: ShoppingItem[],
  products: Product[],
  ctx: { trip: Trip | null; asked: string | null; uid: string; today: DateKey },
): FinishPlan {
  const byId = new Map(products.map(p => [p.id, p]))
  const storeOf = (own: { store?: string }) => own.store ?? ctx.trip?.store ?? ctx.asked ?? undefined
  const row = (name: string, productId: string | undefined, store: string | undefined, amount?: { amount: number; unit: FreezerUnit }) => ({
    name,
    ...(productId ? { productId } : {}),
    ...(store ? { store } : {}),
    dateKey: ctx.today,
    by: ctx.uid,
    ...(amount ? { amount: amount.amount, unit: amount.unit } : {}),
  })

  const cart = inCart(items)
  const bought: string[] = []
  const makeGeneric: string[] = []
  const purchases: FinishPlan['purchases'] = []
  const freezer: FinishPlan['freezer'] = []
  const plainFreezer: FinishPlan['freezer'] = []
  const counted: FinishPlan['counted'] = []
  const entrada: FinishPlan['entrada'] = []
  const used: (string | undefined)[] = []
  const seen = (productId: string) => counted.some(c => c.productId === productId) || entrada.some(e => e.productId === productId)

  for (const i of cart) {
    if (hasParts(i)) {
      const partIds = i.parts.map(part => {
        const p = byId.get(part.productId) ?? findProduct(part.name, products)
        const store = storeOf(part)
        used.push(store)
        purchases.push({ key: part.id, row: row(part.name, p?.id, store, part) })
        if (p) {
          bought.push(p.id)
          freezer.push({ key: part.id, productId: p.id, amount: part.amount, unit: part.unit })
        }
        return p?.id
      })
      const own = i.productId ? byId.get(i.productId) : undefined
      if (own && !partIds.includes(own.id) && !own.generic) makeGeneric.push(own.id)
    } else {
      const p = i.productId ? byId.get(i.productId) : undefined
      const store = storeOf(i)
      used.push(store)
      // counted products move the number (once each, even if two items point at it); the rest record the purchase as before
      const qty = p && isCounted(p) && !seen(p.id) ? (p.lastQty ?? null) : undefined
      if (p && qty !== undefined) {
        if (qty !== null) counted.push({ productId: p.id, qty, key: i.id })
        else entrada.push({ productId: p.id, key: i.id })
      }
      purchases.push({ key: i.id, row: row(i.text, p?.id, store, qty ? { amount: qty, unit: 'un' } : undefined) })
      if (p) {
        bought.push(p.id)
        if (p.location === 'congelador' && !plainFreezer.some(f => f.productId === p.id)) plainFreezer.push({ key: i.id, productId: p.id })
      }
    }
  }

  const named = used.filter((s): s is string => !!s)
  const fromTrip = (ctx.trip?.stores ?? []).filter(s => named.includes(s))
  const stores: (string | null)[] = [...new Set([...fromTrip, ...named])]
  if (used.some(s => !s)) stores.push(null)

  return {
    deleteIds: cart.map(i => i.id),
    boughtIds: [...new Set(bought)].filter(id => !makeGeneric.includes(id) && !byId.get(id)?.generic),
    makeGeneric,
    purchases,
    stores,
    // plain rows are for the OTHER congelador products: one that is also a part already has its part rows
    freezer: [...freezer, ...plainFreezer.filter(f => !freezer.some(x => x.productId === f.productId))],
    counted,
    entrada,
  }
}

/**
 * Names whose purchase "Terminar compras" will really record in Casa (the note must not promise more):
 * the same rule as planFinish, so meat types count and a "Carne" turning generic does not.
 */
export function backToCasa(items: ShoppingItem[], products: Product[]): string[] {
  const { boughtIds } = planFinish(items, products, { trip: null, asked: null, uid: '', today: '' })
  return products.filter(p => boughtIds.includes(p.id)).map(p => p.name).sort((a, b) => a.localeCompare(b, 'pt-PT'))
}
