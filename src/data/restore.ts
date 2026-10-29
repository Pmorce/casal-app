import { doc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { fire } from './write'

/** "Desfazer" after a delete: writes the documents back with their old ids. */
export function restore(path: string, docs: { id: string }[]): void {
  if (!docs.length) return
  const batch = writeBatch(db)
  for (const { id, ...data } of docs) batch.set(doc(db, path, id), data)
  fire(batch.commit())
}
