import { freezerCategoryOf, groupByZone, guessFreezerCategory, guessZone } from './zones'
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
  expect(guessZone('Peito de frango')).toBe('congelador')
  expect(guessZone('Creme de leite')).toBe('frigorifico')
  expect(guessZone('Rolo de cozinha')).toBe('limpeza')
  expect(guessZone('Massa espiral')).toBe('despensa') // "espiral" must not hit "pera"
})

test('meat, fish and frozen goods are guessed as Congelador', () => {
  expect(guessZone('Carne de vaca')).toBe('congelador')
  expect(guessZone('Peito de frango')).toBe('congelador')
  expect(guessZone('Pescada')).toBe('congelador')
  expect(guessZone('Ervilhas congeladas')).toBe('congelador')
  expect(guessZone('Gelado de baunilha')).toBe('congelador')
  expect(guessZone('Pizza')).toBe('congelador')
  expect(guessZone('Leite')).toBe('frigorifico')
  expect(guessZone('Creme de leite')).toBe('frigorifico')
})

test('guessFreezerCategory: meat/fish words → carne, the rest → outros', () => {
  expect(guessFreezerCategory('Bifes de peru')).toBe('carne')
  expect(guessFreezerCategory('Salmão')).toBe('carne')
  expect(guessFreezerCategory('Gelado')).toBe('outros')
  expect(freezerCategoryOf(prod({ name: 'Gelado', freezerCategory: 'carne' }))).toBe('carne')
})

test('Congelador comes right after Frigorífico in the list', () => {
  const products = [prod({ id: 'f', location: 'frigorifico' }), prod({ id: 'c', location: 'congelador' }), prod({ id: 'd', location: 'despensa' })]
  const g = groupByZone([item({ productId: 'd' }), item({ productId: 'c' }), item({ productId: 'f' })], products)
  expect(g.map(x => x.group)).toEqual(['frigorifico', 'congelador', 'despensa'])
})
