import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { arrayUnion, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-casa',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'members/ana'), { name: 'Ana' })
    await setDoc(doc(db, 'members/rui'), { name: 'Rui' })
    for (const col of ['routines', 'routineChecks', 'checklists']) {
      await setDoc(doc(db, `${col}/r1`), { ownerUid: 'rui', name: 'x' })
    }
  })
})

const as = (uid: string) => env.authenticatedContext(uid).firestore()
const SHARED = ['shopping', 'products', 'freezerBags', 'chores', 'expenses', 'meta']

test('unauthenticated cannot read', async () => {
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'shopping/a')))
})

test('signed-in non-member cannot read or write', async () => {
  await assertFails(getDoc(doc(as('intruso'), 'shopping/a')))
  await assertFails(setDoc(doc(as('intruso'), 'shopping/a'), { text: 'x' }))
})

test('members read and write shared collections', async () => {
  for (const col of SHARED) {
    await assertSucceeds(setDoc(doc(as('ana'), `${col}/a`), { v: 1 }))
    await assertSucceeds(getDoc(doc(as('rui'), `${col}/a`)))
  }
})

test('nobody writes members', async () => {
  await assertFails(setDoc(doc(as('ana'), 'members/ana'), { name: 'X' }))
  await assertSucceeds(getDoc(doc(as('ana'), 'members/rui')))
})

for (const col of ['routines', 'routineChecks', 'checklists']) {
  describe(`${col}: visible to both, owner-only writes`, () => {
    test('other member can read', async () => {
      await assertSucceeds(getDoc(doc(as('ana'), `${col}/r1`)))
    })
    test('only the owner updates', async () => {
      await assertFails(updateDoc(doc(as('ana'), `${col}/r1`), { name: 'y' }))
      await assertSucceeds(updateDoc(doc(as('rui'), `${col}/r1`), { name: 'y' }))
    })
    test('cannot create for someone else', async () => {
      await assertFails(setDoc(doc(as('ana'), `${col}/x`), { ownerUid: 'rui' }))
      await assertSucceeds(setDoc(doc(as('ana'), `${col}/y`), { ownerUid: 'ana' }))
    })
    test('cannot hand ownership over', async () => {
      await assertFails(updateDoc(doc(as('rui'), `${col}/r1`), { ownerUid: 'ana' }))
    })
    test('non-member cannot read', async () => {
      await assertFails(getDoc(doc(as('intruso'), `${col}/r1`)))
    })
  })
}

describe('routineChecks: the exact write used to tick a step', () => {
  const tick = (uid: string, owner: string, step: string) =>
    setDoc(doc(as(uid), 'routineChecks/r9_2026-10-29'),
      { ownerUid: owner, routineId: 'r9', dateKey: '2026-10-29', doneStepIds: arrayUnion(step), dayStepIds: ['a', 'b'] },
      { merge: true })

  test('owner: first tick creates, second tick updates', async () => {
    await assertSucceeds(tick('rui', 'rui', 'a'))
    await assertSucceeds(tick('rui', 'rui', 'b'))
  })
  test('the other member cannot tick it', async () => {
    await assertSucceeds(tick('rui', 'rui', 'a'))
    await assertFails(tick('ana', 'rui', 'b'))
  })
})

test('a non-owner cannot delete a routine', async () => {
  await assertFails(deleteDoc(doc(as('ana'), 'routines/r1')))
  await assertSucceeds(deleteDoc(doc(as('rui'), 'routines/r1')))
})
