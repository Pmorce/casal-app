import { deleteField, doc, increment, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import type { Product } from '../domain/types'

const update = (p: Product, data: Record<string, unknown>) => fire(updateDoc(doc(db, 'products', p.id), data))

/** Relative change (-1 / +1, undo): two phones changing at once both count. */
export const changeCount = (p: Product, delta: number): void => update(p, { count: increment(delta) })

/** "Quantos há?" / counting session: an absolute number (integer ≥ 0); it also settles a pending confirmation. */
export const setCount = (p: Product, n: number): void => update(p, { count: n, qtyPending: deleteField() })

/** "Não contar este" on/off. */
export const setUncounted = (p: Product, on: boolean): void => update(p, { uncounted: on ? true : deleteField() })

/** Usual quantity per purchase, asked once for what is new. */
export const setLastQty = (p: Product, n: number): void => update(p, { lastQty: n })

/** "Comprei" on a counted product: the units go on its purchase row. Quiet: the purchase itself is what matters. */
export const setPurchaseQty = (purchaseId: string, n: number): void =>
  fire(updateDoc(doc(db, 'purchases', purchaseId), { amount: n, unit: 'un' }), { quiet: true })

/** "Agora não" in "O que entrou": bought, quantity still to put in (one update per product). */
export const markQtyPending = (products: Product[]): void => products.forEach(p => update(p, { qtyPending: true }))

/** The number was put in: the pending mark goes. */
export const clearQtyPending = (p: Product): void => update(p, { qtyPending: deleteField() })

/** What "O que entrou" wrote, with the products as they were before. */
export interface EntradaDone {
  saved: { product: Product; n: number }[]
  pending: Product[]
}

/** Undoing "Terminar" after "O que entrou": the units come off again (relative) and lastQty/qtyPending go back as they were. */
export function undoEntrada({ saved, pending }: EntradaDone): void {
  const was = (p: Product) => ({ qtyPending: p.qtyPending ?? deleteField() })
  saved.forEach(({ product, n }) => {
    changeCount(product, -n)
    update(product, { lastQty: product.lastQty ?? deleteField(), ...was(product) })
  })
  pending.forEach(p => update(p, was(p)))
}
