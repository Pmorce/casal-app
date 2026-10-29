import { groupByZone, guessZone } from './zones'
import { item, prod } from './testFactories'

test('guessZone recognises fresh food and cleaning, defaults to pantry', () => {
  expect(guessZone('Leite meio-gordo')).toBe('frigorifico')
  expect(guessZone('IOGURTES')).toBe('frigorifico')
  expect(guessZone('Detergente da loiça')).toBe('limpeza')
  expect(guessZone('Papel higiénico')).toBe('limpeza')
  expect(guessZone('Arroz')).toBe('despensa')
})

test('groupByZone groups by the product zone in fixed order, alphabetically', () => {
  const products = [prod({ id: 'l', location: 'frigorifico' }), prod({ id: 'a', location: 'despensa' })]
  const g = groupByZone([
    item({ text: 'Massa', productId: 'a' }), item({ text: 'Arroz', productId: 'a' }),
    item({ text: 'Leite', productId: 'l' }), item({ text: 'Pilhas', oneOff: true }),
    item({ text: 'Velho' }), item({ text: 'Órfão', productId: 'apagado' }),
  ], products)
  expect(g.map(x => x.group)).toEqual(['frigorifico', 'despensa', 'oneOff', 'semZona'])
  expect(g[1].items.map(i => i.text)).toEqual(['Arroz', 'Massa'])
  expect(g[3].items.map(i => i.text)).toEqual(['Órfão', 'Velho'])
})

test('guessZone finds the keyword anywhere in the name, not just the first word', () => {
  expect(guessZone('Peito de frango')).toBe('frigorifico')
  expect(guessZone('Creme de leite')).toBe('frigorifico')
  expect(guessZone('Rolo de cozinha')).toBe('limpeza')
  expect(guessZone('Massa espiral')).toBe('despensa') // "espiral" must not hit "pera"
})
