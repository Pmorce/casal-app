import { useEffect } from 'react'
import { collection, onSnapshot, type QuerySnapshot } from 'firebase/firestore'
import { db } from '../data/firebase'
import { applyTidy } from '../data/tidyRepo'
import { tidyPlan } from '../domain/tidy'
import type { FreezerBag, Product, ShoppingItem } from '../domain/types'

/**
 * Background tidy-up of what two offline phones leave behind (duplicate products, stale names…).
 * Runs only on server-confirmed data while online, so both phones plan from the same truth; our own
 * writes make the next snapshots pending, which keeps it from repeating while they round-trip.
 */
export function useTidyUp(): void {
  useEffect(() => {
    const docs: Record<string, { id: string }[]> = { products: [], shopping: [], freezerBags: [] }
    const fresh: Record<string, boolean> = { products: false, shopping: false, freezerBags: false }

    const check = () => {
      if (!navigator.onLine || !Object.values(fresh).every(Boolean)) return
      const plan = tidyPlan(docs.products as Product[], docs.shopping as ShoppingItem[], docs.freezerBags as FreezerBag[])
      if (!plan.isEmpty) applyTidy(plan)
    }
    const listen = (name: string) => onSnapshot(
      collection(db, name),
      { includeMetadataChanges: true },
      (snap: QuerySnapshot) => {
        docs[name] = snap.docs.map(d => ({ ...d.data(), id: d.id }))
        fresh[name] = !snap.metadata.fromCache && !snap.metadata.hasPendingWrites
        check()
      },
      err => console.error(`useTidyUp(${name})`, err),
    )
    const stops = Object.keys(docs).map(listen)
    return () => stops.forEach(stop => stop())
  }, [])
}
