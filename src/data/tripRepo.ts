import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'
import { normalize } from '../domain/shopping'
import type { DateKey } from '../domain/dates'
import type { Trip } from '../domain/types'

const tripRef = () => doc(db, 'meta', 'trip')

/** "Iniciar compras": the shared trip both phones see; the tick of each item then takes this store. */
export function startTrip(store: string, uid: string, today: DateKey): void {
  fire(setDoc(tripRef(), { store, stores: [store], startedBy: uid, dateKey: today, startedAt: serverTimestamp() }))
}

/** "Mudar de loja": same trip, new store; `stores` remembers every store visited, without repeats. */
export function changeStore(trip: Trip, store: string): void {
  const stores = trip.stores.includes(store) ? trip.stores : [...trip.stores, store]
  fire(setDoc(tripRef(), { store, stores }, { merge: true }))
}

export const leaveTrip = (): void => fire(deleteDoc(tripRef()))

export function restoreTrip(trip: Trip): void {
  const { id: _id, ...data } = trip
  fire(setDoc(tripRef(), data))
}

/** A store typed once is offered next time; the same name (case/accents) is not saved twice. */
export function addCustomStore(name: string, custom: string[]): void {
  const clean = name.trim()
  if (!clean || custom.some(s => normalize(s) === normalize(clean))) return
  fire(setDoc(doc(db, 'meta', 'stores'), { custom: [...custom, clean] }, { merge: true }))
}
