// Creates the two test accounts and their members docs in the local emulators.
// Usage: npm run emu   (in another terminal)   then   node scripts/emu-setup.mjs
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ projectId: 'demo-casa' })
const auth = getAuth()
const db = getFirestore()

for (const [uid, name] of [['ana', 'Ana'], ['rui', 'Rui']]) {
  const email = `${uid}@casa.test`
  try {
    await auth.createUser({ uid, email, password: 'casa1234' })
  } catch (e) {
    if (e.code !== 'auth/uid-already-exists') throw e
  }
  await db.doc(`members/${uid}`).set({ name })
  console.log(`ok: ${email} / casa1234 → ${name}`)
}
