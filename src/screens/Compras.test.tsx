import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Compras from './Compras'
import { item, prod } from '../domain/testFactories'
import type { Product, ShoppingItem } from '../domain/types'

const data = vi.hoisted(() => ({ shopping: [] as ShoppingItem[], products: [] as Product[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) => (path === 'shopping' ? data.shopping : path === 'products' ? data.products : []),
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
const repo = vi.hoisted(() => ({
  addItem: vi.fn(), toggleCart: vi.fn(), deleteItem: vi.fn(), undoFinish: vi.fn(),
  finish: vi.fn(() => ({ items: [], products: [] })),
}))
vi.mock('../data/shoppingRepo', () => repo)
vi.mock('../data/restore', () => ({ restore: vi.fn() }))
const exp = vi.hoisted(() => ({ addExpense: vi.fn() }))
vi.mock('../data/expensesRepo', () => exp)

const renderIt = () => render(<MemoryRouter><Compras /></MemoryRouter>)
beforeEach(() => { vi.clearAllMocks(); data.products = [] })

test('"Terminar compras" only appears with something in the cart', () => {
  data.shopping = [item({ text: 'Café', status: 'porComprar' })]
  const { unmount } = renderIt()
  expect(screen.queryByRole('button', { name: /Terminar compras/ })).toBeNull()
  unmount()

  data.shopping = [item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  expect(screen.getByRole('button', { name: /Terminar compras/ })).toBeTruthy()
})

test('shows who added each item and the shortage reason', () => {
  data.shopping = [item({ text: 'Natas', addedBy: 'B', reason: 'acabou' })]
  renderIt()
  expect(screen.getByText('Rui')).toBeTruthy()
  expect(screen.getByText('acabou')).toBeTruthy()
})

test('items in the cart cannot be deleted by mistake: only un-ticked', () => {
  data.shopping = [item({ text: 'Café', status: 'carrinho' }), item({ text: 'Ovos', status: 'porComprar' })]
  renderIt()
  expect(screen.queryByRole('button', { name: 'Apagar Café' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Apagar Ovos' })).toBeTruthy()
})

test('deleting an item offers undo', () => {
  data.shopping = [item({ text: 'Ovos', status: 'porComprar' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Apagar Ovos' }))
  expect(repo.deleteItem).toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Desfazer' })).toBeTruthy()
})

test('the note names exactly what goes back to Casa', () => {
  data.products = [prod({ id: 'p1', name: 'Leite' })]
  data.shopping = [item({ text: 'Leite', status: 'carrinho', productId: 'p1' }), item({ text: 'Natas', status: 'carrinho' })]
  renderIt()
  expect(screen.getByText(/Voltam a "há" em Casa: Leite\./)).toBeTruthy()
})

test('the note says nothing changes in Casa when no cart item is a Casa product', () => {
  data.shopping = [item({ text: 'Café', status: 'carrinho', productId: 'apagado' })]
  renderIt()
  expect(screen.getByText(/Casa não muda/)).toBeTruthy()
})

test('finishing asks how much it was and records it in Gastos', () => {
  data.shopping = [item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  fireEvent.change(screen.getByPlaceholderText(/47,30/), { target: { value: '47,30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registar' }))
  expect(exp.addExpense).toHaveBeenCalledWith(4730, 'P', '2026-10-29')
  expect(screen.queryByText(/Quanto foi/)).toBeNull()
})
