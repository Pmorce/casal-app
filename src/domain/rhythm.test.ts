import { recordPurchase, rhythmOf, snoozeUntil, stockStatus, typicalGap } from './rhythm'
import { bag, item, prod } from './testFactories'

test('recordPurchase keeps unique sorted dates, last 8', () => {
  expect(recordPurchase(['2026-10-01'], '2026-10-01')).toEqual(['2026-10-01'])
  expect(recordPurchase(undefined, '2026-10-05')).toEqual(['2026-10-05'])
  const ten = Array.from({ length: 10 }, (_, i) => `2026-09-${String(i + 10)}`)
  expect(recordPurchase(ten, '2026-10-01')).toHaveLength(8)
  expect(recordPurchase(ten, '2026-10-01').at(-1)).toBe('2026-10-01')
})

test('typicalGap is the median gap, null before two purchases', () => {
  expect(typicalGap(['2026-10-01'])).toBeNull()
  expect(typicalGap(['2026-10-01', '2026-10-11', '2026-10-19', '2026-10-31'])).toBe(10)
})

test('due only well past the rhythm', () => {
  const p = prod({ boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'] }) // gap 10
  expect(rhythmOf(p, '2026-10-02').due).toBe(false) // 11 days < 12
  expect(rhythmOf(p, '2026-10-03')).toEqual({ gap: 10, since: 12, due: true })
})

test('a single known gap needs a bigger margin', () => {
  const p = prod({ boughtKeys: ['2026-09-01', '2026-09-11'] }) // gap 10 → 15
  expect(rhythmOf(p, '2026-09-25').due).toBe(false)
  expect(rhythmOf(p, '2026-09-26').due).toBe(true)
})

test('short gaps still need two extra days', () => {
  const p = prod({ boughtKeys: ['2026-10-01', '2026-10-03', '2026-10-05'] }) // gap 2 → 4
  expect(rhythmOf(p, '2026-10-08').due).toBe(false)
  expect(rhythmOf(p, '2026-10-09').due).toBe(true)
})

test('snoozed or given up is not due', () => {
  const base = { boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'] }
  expect(rhythmOf(prod({ ...base, snoozedUntil: '2026-10-10' }), '2026-10-05').due).toBe(false)
  expect(rhythmOf(prod({ ...base, snoozeCount: 3 }), '2026-10-05').due).toBe(false)
})

test('snoozeUntil is a third of the gap, at least 2 days; 7 days without a rhythm', () => {
  expect(snoozeUntil(prod({ boughtKeys: ['2026-09-01', '2026-09-13', '2026-09-25'] }), '2026-10-01')).toBe('2026-10-05')
  expect(snoozeUntil(prod(), '2026-10-01')).toBe('2026-10-08')
})

test('stockStatus: on the list is missing, past the rhythm is maybe, everything else is there', () => {
  const late = prod({ id: 'l', boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'] })
  expect(stockStatus(late, [item({ productId: 'l', status: 'carrinho' })], '2026-10-29')).toBe('falta')
  expect(stockStatus(late, [], '2026-10-29')).toBe('talvez')
  expect(stockStatus(prod({ ...late, snoozedUntil: '2026-11-05' }), [], '2026-10-29')).toBe('ha')
  expect(stockStatus(prod({ boughtKeys: ['2026-10-28'] }), [], '2026-10-29')).toBe('ha')
  expect(stockStatus(prod(), [], '2026-10-29')).toBe('ha') // never bought through the app
})

describe('stockStatus for Congelador products counts bags', () => {
  const p = prod({ id: 'v', name: 'Vaca', location: 'congelador', boughtKeys: ['2026-10-01'] })
  test('bags → ha; none → talvez; on the list → falta', () => {
    expect(stockStatus(p, [], '2026-10-29', [bag({ productId: 'v' })])).toBe('ha')
    expect(stockStatus(p, [], '2026-10-29', [])).toBe('talvez')
    expect(stockStatus(p, [item({ productId: 'v' })], '2026-10-29', [])).toBe('falta')
  })
  test('never bought through the app, or snoozed → not talvez', () => {
    expect(stockStatus({ ...p, boughtKeys: undefined }, [], '2026-10-29', [])).toBe('ha')
    expect(stockStatus({ ...p, snoozedUntil: '2026-11-05' }, [], '2026-10-29', [])).toBe('ha')
  })
  test('snooze without a rhythm lasts 7 days', () => {
    expect(snoozeUntil(p, '2026-10-29')).toBe('2026-11-05')
  })
})
