import { describe, expect, test } from 'vitest'
import { STORES, activeTrip, customStores, staleTrip, storeOptions } from './stores'
import { purchase } from './testFactories'

const trip = (dateKey: string) => ({ id: 'trip', store: 'Lidl', stores: ['Lidl'], startedBy: 'Ana', dateKey })
const sorted = (a: readonly string[]) => [...a].sort((x, y) => x.localeCompare(y, 'pt-PT'))

describe('trip', () => {
  test('activeTrip returns today trip, stale one is separate', () => {
    expect(activeTrip([trip('2026-11-18')], '2026-11-18')?.store).toBe('Lidl')
    expect(activeTrip([trip('2026-11-17')], '2026-11-18')).toBeNull()
    expect(staleTrip([trip('2026-11-17')], '2026-11-18')?.id).toBe('trip')
    expect(staleTrip([trip('2026-11-18')], '2026-11-18')).toBeNull()
    expect(activeTrip([], '2026-11-18')).toBeNull()
    expect(staleTrip([{ id: 'stores' }], '2026-11-18')).toBeNull()
  })
  test('customStores', () => {
    expect(customStores([{ id: 'stores', custom: ['Talho Zé'] } as never])).toEqual(['Talho Zé'])
    expect(customStores([])).toEqual([])
  })
})

describe('storeOptions', () => {
  test('empty equals STORES alphabetical', () => {
    expect(storeOptions([], [])).toEqual(sorted(STORES))
  })
  test('sorted by purchase count', () => {
    const ps = [purchase({ store: 'Lidl' }), purchase({ store: 'Lidl' }), purchase({ store: 'Aldi' })]
    const o = storeOptions([], ps)
    expect(o.slice(0, 2)).toEqual(['Lidl', 'Aldi'])
    expect(o.slice(2)).toEqual(sorted(STORES.filter(s => s !== 'Lidl' && s !== 'Aldi')))
  })
  test('custom deduplicated', () => {
    const o = storeOptions(['lidl', 'Talho Zé'], [])
    expect(o.filter(s => s === 'Talho Zé')).toHaveLength(1)
    expect(o.filter(s => s.toLowerCase() === 'lidl')).toHaveLength(1)
  })
})
