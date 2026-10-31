import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, type WhereFilterOp } from 'firebase/firestore'
import { db } from './firebase'

export type Where = [field: string, op: WhereFilterOp, value: unknown]

// last docs seen per query: a screen opened again starts from them instead of empty (no flash of
// "Nada por comprar" while the offline cache answers); the live snapshot replaces them right after
const lastSeen = new Map<string, unknown[]>()

/** Live list of a collection's documents (with `id`), served from the offline cache first. */
export function useCollection<T extends { id: string }>(path: string, filter?: Where): T[] {
  const filterKey = JSON.stringify(filter ?? null)
  const key = `${path}|${filterKey}`
  const [docs, setDocs] = useState<T[]>(() => (lastSeen.get(key) as T[] | undefined) ?? [])

  useEffect(() => {
    // the query changed while mounted: show what is known for the new one, not the old one's docs
    setDocs((lastSeen.get(key) as T[] | undefined) ?? [])
    const ref = filter ? query(collection(db, path), where(...filter)) : collection(db, path)
    return onSnapshot(
      ref,
      snap => {
        const next = snap.docs.map(d => ({ ...d.data(), id: d.id }) as T)
        lastSeen.set(key, next)
        setDocs(next)
      },
      err => console.error(`useCollection(${path})`, err),
    )
    // filter is captured through filterKey (part of key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return docs
}
