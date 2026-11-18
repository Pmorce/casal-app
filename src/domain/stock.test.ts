import { countState, fridgeDays, inFreezer, inFridge, isCounted, porContar, shownCount, staleCount } from './stock'
import { bag, item, prod } from './testFactories'

const today = '2026-11-18'

test('countState: on the list is falta', () => {
  const p = prod({ id: 'a', count: 3 })
  expect(countState(p, [item({ productId: 'a' })], today)).toBe('falta')
})

test('countState: pending quantity, zero, negative and positive counts', () => {
  expect(countState(prod({ count: 0, qtyPending: true }), [], today)).toBe('ha')
  expect(countState(prod({ count: 0 }), [], today)).toBe('acabou')
  expect(countState(prod({ count: -1 }), [], today)).toBe('acabou')
  expect(countState(prod({ count: 3 }), [], today)).toBe('ha')
})

test('countState: null when not counted (uncounted, no count, congelador)', () => {
  expect(countState(prod({ uncounted: true, count: 3 }), [], today)).toBeNull()
  expect(countState(prod(), [], today)).toBeNull()
  expect(countState(prod({ location: 'congelador', count: 2 }), [], today)).toBeNull()
})

test('isCounted and shownCount', () => {
  expect(isCounted(prod({ count: 0 }))).toBe(true)
  expect(isCounted(prod({ count: 2, location: 'limpeza' }))).toBe(true)
  expect(isCounted(prod({ count: 2, uncounted: true }))).toBe(false)
  expect(shownCount(prod({ count: -2 }))).toBe(0)
  expect(shownCount(prod())).toBe(0)
  expect(shownCount(prod({ count: 4 }))).toBe(4)
})

test('porContar lists by zone then name, skipping counted, uncounted and congelador', () => {
  const list = porContar([
    prod({ name: 'Arroz', location: 'despensa' }),
    prod({ name: 'Iogurtes', location: 'frigorifico' }),
    prod({ name: 'Sal', location: 'despensa', uncounted: true }),
    prod({ name: 'Leite', location: 'despensa', count: 2 }),
    prod({ name: 'Gelado', location: 'congelador' }),
    prod({ name: 'Lixívia', location: 'limpeza' }),
    prod({ name: 'Carne', location: 'frigorifico', generic: true }),
  ])
  expect(list.map(p => p.name)).toEqual(['Iogurtes', 'Arroz', 'Lixívia'])
})

test('staleCount: counted, stock left and seen long ago against the rhythm', () => {
  const keys = ['2026-10-20', '2026-10-27', '2026-11-03'] // gap 7, since 15 on 2026-11-18
  expect(staleCount(prod({ boughtKeys: keys, count: 5 }), today)).toBe(true)
  expect(staleCount(prod({ boughtKeys: keys, count: 0 }), today)).toBe(false)
  expect(staleCount(prod({ count: 5 }), today)).toBe(false)
})

test('inFreezer and inFridge split the bags', () => {
  const a = bag()
  const b = bag({ where: 'frigorifico' })
  expect(inFreezer([a, b])).toEqual([a])
  expect(inFridge([a, b])).toEqual([b])
})

test('inFridge puts the oldest first', () => {
  const young = bag({ where: 'frigorifico', movedKey: '2026-11-17' })
  const old = bag({ where: 'frigorifico', addedKey: '2026-10-01', movedKey: '2026-11-10' })
  expect(inFridge([young, old])).toEqual([old, young])
})

test('fridgeDays counts from movedKey, else addedKey', () => {
  expect(fridgeDays(bag({ where: 'frigorifico', movedKey: '2026-11-15' }), today)).toBe(3)
  expect(fridgeDays(bag({ where: 'frigorifico', addedKey: '2026-11-16' }), today)).toBe(2)
})
