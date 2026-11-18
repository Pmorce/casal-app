import { meatProductOf, meatTypes, partsLine } from './meat'
import { item, part, prod } from './testFactories'

test('meatProductOf is the linked Congelador meat product; peas and milk are not meat', () => {
  const carne = prod({ id: 'c', name: 'Carne', location: 'congelador', freezerCategory: 'carne', generic: true })
  const ervilhas = prod({ id: 'e', name: 'Ervilhas', location: 'congelador', freezerCategory: 'outros' })
  const leite = prod({ id: 'l', name: 'Leite', location: 'frigorifico' })
  const products = [carne, ervilhas, leite]
  expect(meatProductOf(item({ productId: 'c' }), products)).toBe(carne)
  expect(meatProductOf(item({ productId: 'e' }), products)).toBeNull()
  expect(meatProductOf(item({ productId: 'l' }), products)).toBeNull()
  expect(meatProductOf(item({ text: 'Carne', oneOff: true }), products)).toBeNull()
})

test('meatTypes puts the own product first, then the most bought meat, then by name', () => {
  const frango = prod({ id: 'f', name: 'Frango', location: 'congelador', freezerCategory: 'carne' })
  const vaca = prod({ id: 'v', name: 'Vaca', location: 'congelador', freezerCategory: 'carne', boughtKeys: ['2026-10-01', '2026-10-08'] })
  const almondegas = prod({ id: 'a', name: 'Almôndegas', location: 'congelador', freezerCategory: 'carne' })
  const ervilhas = prod({ id: 'e', name: 'Ervilhas', location: 'congelador', freezerCategory: 'outros' })
  const peixe = prod({ id: 'p', name: 'Peixe', location: 'congelador', freezerCategory: 'carne', generic: true })
  const leite = prod({ id: 'l', name: 'Leite', location: 'frigorifico' })
  const products = [frango, vaca, almondegas, ervilhas, peixe, leite]
  expect(meatTypes(frango, products).map(p => p.name)).toEqual(['Frango', 'Vaca', 'Almôndegas'])
})

test('a generic own product is not offered as a type', () => {
  const carne = prod({ id: 'c', name: 'Carne', location: 'congelador', freezerCategory: 'carne', generic: true })
  const vaca = prod({ id: 'v', name: 'Vaca', location: 'congelador', freezerCategory: 'carne' })
  expect(meatTypes(carne, [carne, vaca]).map(p => p.name)).toEqual(['Vaca'])
  expect(meatTypes(carne, [carne])).toEqual([])
})

test('partsLine says what is in the cart, pt-PT numbers and unit labels', () => {
  expect(partsLine([part({ name: 'Vaca', amount: 2.5, unit: 'kg' }), part({ name: 'Almôndegas', amount: 6, unit: 'un' })]))
    .toBe('2,5 kg Vaca · 6 un. Almôndegas')
})
