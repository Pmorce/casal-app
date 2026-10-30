import { mergePurchases } from './rhythm'
import { normalize } from './shopping'
import type { FreezerBag, Product, ShoppingItem } from './types'

export interface TidyPlan {
  /** product field changes (merge result on the kept product) */
  products: { id: string; data: Partial<Pick<Product, 'boughtKeys' | 'freezerLast' | 'freezerCategory'>> }[]
  deleteProducts: string[]
  items: { id: string; data: Partial<Pick<ShoppingItem, 'productId' | 'text'>> }[]
  deleteItems: string[]
  bags: { id: string; data: Partial<Pick<FreezerBag, 'productId' | 'name'>> }[]
  isEmpty: boolean
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Fixes what two offline phones leave behind: a product created twice, stale names on linked
 * items/bags, the same thing twice on the list. Pure and convergent: planning again on the applied
 * result gives an empty plan.
 */
export function tidyPlan(products: Product[], items: ShoppingItem[], bags: FreezerBag[]): TidyPlan {
  // 1. same product twice: the one with most purchases survives
  const groups = new Map<string, Product[]>()
  for (const p of products) {
    const k = normalize(p.name)
    groups.set(k, [...(groups.get(k) ?? []), p])
  }
  const remap = new Map<string, string>()
  const kept = new Map<string, Product>()
  const productChanges: TidyPlan['products'] = []
  const deleteProducts: string[] = []
  for (const group of groups.values()) {
    const [keep, ...others] = [...group].sort(
      (a, b) => (b.boughtKeys?.length ?? 0) - (a.boughtKeys?.length ?? 0) || byId(a, b),
    )
    kept.set(keep.id, keep)
    let keys = keep.boughtKeys
    let last = keep.freezerLast
    let cat = keep.freezerCategory
    for (const o of others) {
      keys = mergePurchases(keys, o.boughtKeys)
      last ??= o.freezerLast
      cat ??= o.freezerCategory
      remap.set(o.id, keep.id)
      deleteProducts.push(o.id)
    }
    const data: TidyPlan['products'][number]['data'] = {}
    if (JSON.stringify(keys ?? []) !== JSON.stringify(keep.boughtKeys ?? [])) data.boughtKeys = keys
    if (last !== keep.freezerLast) data.freezerLast = last
    if (cat !== keep.freezerCategory) data.freezerCategory = cat
    if (Object.keys(data).length) productChanges.push({ id: keep.id, data })
  }

  /** the surviving product an item/bag stands for (after the merge), if it exists */
  const productOf = (id?: string) => (id === undefined ? undefined : kept.get(remap.get(id) ?? id))

  // 3. same thing twice on the list: decided first, so the dropped ones get no update
  const keyOf = (i: ShoppingItem) => {
    const p = productOf(i.productId)
    return p ? p.id : 't:' + normalize(i.text)
  }
  const byKey = new Map<string, ShoppingItem[]>()
  for (const i of items) byKey.set(keyOf(i), [...(byKey.get(keyOf(i)) ?? []), i])
  const dropped = new Set<string>()
  for (const list of byKey.values()) {
    if (list.length < 2) continue
    const survivor = [...list].sort((a, b) => Number(b.status === 'carrinho') - Number(a.status === 'carrinho') || byId(a, b))[0]
    for (const i of list) if (i !== survivor) dropped.add(i.id)
  }

  // 1 (relink) + 2 (stale names): one entry per doc
  const itemChanges: TidyPlan['items'] = []
  for (const i of items) {
    const p = productOf(i.productId)
    if (!p || dropped.has(i.id)) continue
    const data: TidyPlan['items'][number]['data'] = {}
    if (i.productId !== p.id) data.productId = p.id
    if (i.text !== p.name) data.text = p.name
    if (Object.keys(data).length) itemChanges.push({ id: i.id, data })
  }
  const bagChanges: TidyPlan['bags'] = []
  for (const b of bags) {
    const p = productOf(b.productId)
    if (!p) continue
    const data: TidyPlan['bags'][number]['data'] = {}
    if (b.productId !== p.id) data.productId = p.id
    if (b.name !== p.name) data.name = p.name
    if (Object.keys(data).length) bagChanges.push({ id: b.id, data })
  }

  const deleteItems = [...dropped]
  return {
    products: productChanges,
    deleteProducts,
    items: itemChanges,
    deleteItems,
    bags: bagChanges,
    isEmpty: ![productChanges, deleteProducts, itemChanges, deleteItems, bagChanges].some((l) => l.length),
  }
}
