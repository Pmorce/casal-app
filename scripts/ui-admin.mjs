// Admin access to the Firestore emulator for UI scenarios (bypasses security rules).
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'

import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) initializeApp({ projectId: 'demo-casa' })
export const adminDb = getFirestore()

/** Clean database with the two members. */
export async function resetDb() {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-casa/databases/(default)/documents', { method: 'DELETE' })
  await adminDb.doc('members/ana').set({ name: 'Ana' })
  await adminDb.doc('members/rui').set({ name: 'Rui' })
}
