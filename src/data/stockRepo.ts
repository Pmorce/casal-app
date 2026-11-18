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
