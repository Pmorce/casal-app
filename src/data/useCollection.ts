import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, type WhereFilterOp } from 'firebase/firestore'
import { db } from './firebase'

export type Where = [field: string, op: WhereFilterOp, value: unknown]

/** Live list of a collection's documents (with `id`), served from the offline cache first. */
export function useCollection<T extends { id: string }>(path: string, filter?: Where): T[] {
  const [docs, setDocs] = useState<T[]>([])
  const filterKey = JSON.stringify(filter ?? null)

  useEffect(() => {
    const ref = filter ? query(collection(db, path), where(...filter)) : collection(db, path)
    return onSnapshot(
      ref,
      snap => setDocs(snap.docs.map(d => ({ ...d.data(), id: d.id }) as T)),
      err => console.error(`useCollection(${path})`, err),
    )
    // filter is captured through filterKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, filterKey])

  return docs
}
