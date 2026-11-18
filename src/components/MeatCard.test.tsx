import { fireEvent, render, screen } from '@testing-library/react'
import MeatCard from './MeatCard'
import { item, part, prod } from '../domain/testFactories'
import type { ShoppingItem } from '../domain/types'

const repo = vi.hoisted(() => ({
  addPart: vi.fn(), removePart: vi.fn(), clearParts: vi.fn(),
  ensureMeatProduct: vi.fn((_name: string, _products: unknown) => ({ id: 'novo', name: 'Almôndegas' })),
}))
vi.mock('../data/shoppingRepo', () => repo)

const carne = prod({ id: 'c', name: 'Carne', location: 'congelador', freezerCategory: 'carne', generic: true })
const vaca = prod({ id: 'v', name: 'Vaca', location: 'congelador', freezerCategory: 'carne', boughtKeys: ['2026-10-01'] })
const frango = prod({ id: 'f', name: 'Frango', location: 'congelador', freezerCategory: 'carne', freezerLast: { amount: 6, unit: 'un' } })
const products = [carne, vaca, frango]

const renderIt = (it: ShoppingItem = item({ id: 'i1', text: 'Carne', productId: 'c' }), { store }: { store?: string } = { store: 'Lidl' }) => {
  const onClose = vi.fn()
  render(<MeatCard item={it} own={carne} products={products} store={store} onClose={onClose} />)
  return { it, onClose }
}
const amount = () => screen.getByLabelText('Quantidade') as HTMLInputElement
const put = () => screen.getByRole('button', { name: 'Pôr no carrinho' }) as HTMLButtonElement
beforeEach(() => { vi.clearAllMocks() })

test('asks what goes in, with the most bought type picked and kg for meat', () => {
  renderIt()
  expect(screen.getByRole('heading', { name: 'Carne — o que levas?' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Tipo: Vaca' }).className).toContain('on')
  expect(screen.queryByRole('button', { name: 'Tipo: Carne' })).toBeNull()
  expect(screen.getByRole('button', { name: 'kg' }).className).toContain('on')
})

test('a new type ("+ outro") starts in units, not kg', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: '+ outro' }))
  expect(screen.getByRole('button', { name: 'un.' }).className).toContain('on')
  expect(screen.getByRole('button', { name: 'kg' }).className).not.toContain('on')
})

test('a bad or empty amount keeps "Pôr no carrinho" disabled', () => {
  renderIt()
  for (const v of ['abc', '', '0']) {
    fireEvent.change(amount(), { target: { value: v } })
    expect(put().disabled).toBe(true)
  }
})

test('"2,5" puts a part of the chosen type in the cart, with the store, and closes', () => {
  const { it, onClose } = renderIt()
  fireEvent.change(amount(), { target: { value: '2,5' } })
  fireEvent.click(put())
  expect(repo.addPart).toHaveBeenCalledWith(it, { productId: 'v', name: 'Vaca', amount: 2.5, unit: 'kg', store: 'Lidl' })
  expect(onClose).toHaveBeenCalled()
})

test('without a trip the part has no store field', () => {
  const { it } = renderIt(undefined, {})
  fireEvent.change(amount(), { target: { value: '1' } })
  fireEvent.click(put())
  expect(repo.addPart).toHaveBeenCalledWith(it, { productId: 'v', name: 'Vaca', amount: 1, unit: 'kg' })
})

test('changing the type brings its last amount and unit', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Tipo: Frango' }))
  expect(amount().value).toBe('6')
  expect(screen.getByRole('button', { name: 'un.' }).className).toContain('on')
})

test('"+ outro" creates the type by name and puts it in the cart', () => {
  const { it } = renderIt()
  fireEvent.click(screen.getByRole('button', { name: '+ outro' }))
  fireEvent.change(screen.getByLabelText('Nome do tipo'), { target: { value: 'Almôndegas' } })
  fireEvent.change(amount(), { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: 'un.' }))
  fireEvent.click(put())
  expect(repo.ensureMeatProduct).toHaveBeenCalledWith('Almôndegas', products)
  expect(repo.addPart).toHaveBeenCalledWith(it, { productId: 'novo', name: 'Almôndegas', amount: 6, unit: 'un', store: 'Lidl' })
})

test('"+ outro" with no name keeps "Pôr no carrinho" disabled', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: '+ outro' }))
  fireEvent.change(amount(), { target: { value: '2' } })
  expect(put().disabled).toBe(true)
})

test('shows what is already in, each part with ✕, and "Tirar tudo do carrinho"', () => {
  const p1 = part({ id: 'a', name: 'Vaca', amount: 3, unit: 'kg', store: 'Lidl' })
  const p2 = part({ id: 'b', name: 'Vazia', amount: 1, unit: 'kg', store: 'Lidl' })
  const { it, onClose } = renderIt(item({ id: 'i1', text: 'Carne', productId: 'c', status: 'carrinho', parts: [p1, p2] }))
  expect(screen.getByText('3 kg Vaca (Lidl)')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Tirar 3 kg Vaca' }))
  expect(repo.removePart).toHaveBeenCalledWith(it, 'a')
  fireEvent.click(screen.getByRole('button', { name: 'Tirar tudo do carrinho' }))
  expect(repo.clearParts).toHaveBeenCalledWith(it)
  expect(onClose).toHaveBeenCalled()
})

test('with nothing in the cart there is no "Tirar tudo do carrinho"', () => {
  renderIt()
  expect(screen.queryByRole('button', { name: 'Tirar tudo do carrinho' })).toBeNull()
})
