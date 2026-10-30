import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Compras from './Compras'
import { item, prod } from '../domain/testFactories'
import type { FreezerBag, Product, ShoppingItem } from '../domain/types'

const data = vi.hoisted(() => ({ shopping: [] as ShoppingItem[], products: [] as Product[], bags: [] as FreezerBag[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) =>
    (path === 'shopping' ? data.shopping : path === 'products' ? data.products : path === 'freezerBags' ? data.bags : []),
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
const repo = vi.hoisted(() => ({
  addItem: vi.fn(), toggleCart: vi.fn(), deleteItem: vi.fn(), undoFinish: vi.fn(),
  classifyItem: vi.fn(), markMissing: vi.fn(), snooze: vi.fn(),
  finish: vi.fn(() => ({ items: [], products: [] })),
}))
vi.mock('../data/shoppingRepo', () => repo)
vi.mock('../data/restore', () => ({ restore: vi.fn() }))
const exp = vi.hoisted(() => ({ addExpense: vi.fn() }))
vi.mock('../data/expensesRepo', () => exp)
const frozen = { bagIds: ['b1', 'b2'], previous: [] }
const freezer = vi.hoisted(() => ({ freezeBought: vi.fn((): unknown => null), undoFreeze: vi.fn() }))
vi.mock('../data/freezerRepo', () => freezer)

const renderIt = () => render(<MemoryRouter><Compras /></MemoryRouter>)
beforeEach(() => { vi.clearAllMocks(); data.products = []; data.bags = []; freezer.freezeBought.mockReturnValue(frozen) })

test('"Terminar compras" only appears with something in the cart', () => {
  data.shopping = [item({ text: 'Café', status: 'porComprar' })]
  const { unmount } = renderIt()
  expect(screen.queryByRole('button', { name: /Terminar compras/ })).toBeNull()
  unmount()

  data.shopping = [item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  expect(screen.getByRole('button', { name: /Terminar compras/ })).toBeTruthy()
})

test('shows who added each item', () => {
  data.shopping = [item({ text: 'Natas', addedBy: 'B', oneOff: true })]
  renderIt()
  expect(screen.getByText('Rui')).toBeTruthy()
})

test('a new name asks for the zone with a guess already picked', () => {
  repo.addItem.mockReturnValueOnce('needsZone')
  renderIt()
  fireEvent.change(screen.getByPlaceholderText(/Adicionar/), { target: { value: 'Iogurtes' } })
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(screen.getByRole('button', { name: 'Frigorífico' }).className).toContain('on')
  fireEvent.click(screen.getByRole('button', { name: 'Despensa' }))
  expect(repo.addItem).toHaveBeenLastCalledWith('Iogurtes', 'P', [], expect.any(Array), 'despensa')
})

test('the list is grouped by zone', () => {
  data.products = [prod({ id: 'l', location: 'frigorifico' }), prod({ id: 'd', location: 'limpeza' })]
  data.shopping = [item({ text: 'Lixívia', productId: 'd' }), item({ text: 'Leite', productId: 'l' })]
  renderIt()
  const titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
  expect(titles).toEqual(['Frigorífico', 'Limpeza e higiene'])
})

test('legacy items with a reason field still render', () => {
  data.shopping = [{ ...item({ text: 'Natas' }), reason: 'acabou' } as never]
  renderIt()
  expect(screen.getByText('Natas')).toBeTruthy()
})

test('"Sem zona" items get a zone picker', () => {
  data.shopping = [item({ text: 'Velho' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Velho: Limpeza' }))
  expect(repo.classifyItem).toHaveBeenCalledWith(expect.objectContaining({ text: 'Velho' }), 'limpeza', [])
})

test('"Talvez falte" shows overdue products with Falta and Ainda há', () => {
  data.products = [prod({ id: 'c', name: 'Café', boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'] })]
  renderIt()
  expect(screen.getByText(/costuma durar ~10 dias · vai em 38/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Falta' }))
  expect(repo.markMissing).toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Ainda há' }))
  expect(repo.snooze).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }), '2026-10-29')
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

test('the note names exactly what gets recorded in Casa', () => {
  data.products = [prod({ id: 'p1', name: 'Leite' })]
  data.shopping = [item({ text: 'Leite', status: 'carrinho', productId: 'p1' }), item({ text: 'Natas', status: 'carrinho' })]
  renderIt()
  expect(screen.getByText(/registado em Casa que compraram: Leite\./)).toBeTruthy()
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

test('the "how much" question appears where the cart was, not at the top of the screen', () => {
  data.shopping = [item({ text: 'Ovos', status: 'porComprar', oneOff: true }), item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  const question = screen.getByText(/Quanto foi/)
  const list = screen.getByText('Por comprar')
  expect(list.compareDocumentPosition(question) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

const freezerCart = () => {
  data.products = [prod({ id: 'v', name: 'Carne de vaca', location: 'congelador' })]
  data.shopping = [item({ text: 'Carne de vaca', status: 'carrinho', productId: 'v' })]
}

test('finishing with Congelador products asks what went to the freezer, then how much it was', () => {
  freezerCart()
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  expect(screen.getByText(/Para o congelador/)).toBeTruthy()
  expect(screen.queryByText(/Quanto foi/)).toBeNull()
  fireEvent.change(screen.getByLabelText('Quantidade de Carne de vaca'), { target: { value: '5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(freezer.freezeBought).toHaveBeenCalled()
  expect(screen.queryByText(/Para o congelador/)).toBeNull()
  expect(screen.getByText(/Quanto foi/)).toBeTruthy()
})

test('finishing without Congelador products goes straight to "Quanto foi?"', () => {
  data.shopping = [item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  expect(screen.queryByText(/Para o congelador/)).toBeNull()
  expect(screen.getByText(/Quanto foi/)).toBeTruthy()
})

test('Desfazer after saving the freezer card also deletes the new bags', () => {
  freezerCart()
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  fireEvent.change(screen.getByLabelText('Quantidade de Carne de vaca'), { target: { value: '5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(repo.undoFinish).toHaveBeenCalled()
  expect(freezer.undoFreeze).toHaveBeenCalledWith(frozen)
  expect(screen.queryByText(/Quanto foi/)).toBeNull()
})

test('a Congelador product without bags shows in Talvez falte as "não há no congelador"', () => {
  data.products = [prod({ id: 'v', name: 'Carne de vaca', location: 'congelador', boughtKeys: ['2026-10-01'], freezerLast: { amount: 1, unit: 'kg', key: '2026-10-01' } })]
  data.shopping = []
  renderIt()
  expect(screen.getByText('não há no congelador')).toBeTruthy()
})

test('finishing again with the freezer card open adds the new products to it, keeping what was typed', () => {
  freezerCart()
  const { rerender } = renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  fireEvent.change(screen.getByLabelText('Quantidade de Carne de vaca'), { target: { value: '5' } })
  data.products = [...data.products, prod({ id: 'g', name: 'Gelado', location: 'congelador' })]
  data.shopping = [item({ text: 'Gelado', status: 'carrinho', productId: 'g' })]
  rerender(<MemoryRouter><Compras /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  expect((screen.getByLabelText('Quantidade de Carne de vaca') as HTMLInputElement).value).toBe('5')
  expect(screen.getByLabelText('Quantidade de Gelado')).toBeTruthy()
})
