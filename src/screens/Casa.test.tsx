import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Casa from './Casa'
import { bag, item, prod } from '../domain/testFactories'
import type { FreezerBag, Product, ShoppingItem } from '../domain/types'

const data = vi.hoisted(() => ({ shopping: [] as ShoppingItem[], products: [] as Product[], bags: [] as FreezerBag[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) =>
    (path === 'shopping' ? data.shopping : path === 'products' ? data.products : path === 'freezerBags' ? data.bags : []),
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
const repo = vi.hoisted(() => ({
  addProduct: vi.fn(), deleteProduct: vi.fn(), renameProduct: vi.fn(), moveProduct: vi.fn(),
  markMissing: vi.fn(), undoBought: vi.fn(), snooze: vi.fn(), setFreezerCategory: vi.fn(),
  boughtOutside: vi.fn((p: unknown) => ({ product: p, items: [] })),
}))
vi.mock('../data/shoppingRepo', () => repo)
vi.mock('../data/restore', () => ({ restore: vi.fn() }))
const exp = vi.hoisted(() => ({ addExpense: vi.fn() }))
vi.mock('../data/expensesRepo', () => exp)
vi.mock('../data/freezerRepo', () => ({ freezeBought: vi.fn(() => []) }))

const renderIt = () => render(<MemoryRouter><Casa /></MemoryRouter>)
beforeEach(() => { vi.clearAllMocks(); data.products = []; data.shopping = []; data.bags = [] })

test('each product shows its rhythm and has Falta and Comprei', () => {
  data.products = [prod({ id: 'c', name: 'Café', boughtKeys: ['2026-10-09', '2026-10-19'] })]
  renderIt()
  expect(screen.getByText(/comprado há 10 dias · dura ~10/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Falta Café' }))
  expect(repo.markMissing).toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Comprei Café' }))
  expect(repo.boughtOutside).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }), [], '2026-10-29')
  expect(screen.getByRole('button', { name: 'Desfazer' })).toBeTruthy()
})

test('products still learning or never bought say so', () => {
  data.products = [prod({ name: 'Arroz', boughtKeys: ['2026-10-01'] }), prod({ name: 'Sal' })]
  renderIt()
  expect(screen.getByText(/a aprender/)).toBeTruthy()
  expect(screen.getByText(/nunca comprado/)).toBeTruthy()
})

test('products are grouped by what is missing first, then what may be, then what is there', () => {
  data.products = [
    prod({ id: 'a', name: 'Arroz', boughtKeys: ['2026-10-28'] }),
    prod({ id: 'd', name: 'Detergente', location: 'limpeza', boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'] }),
    prod({ id: 'c', name: 'Café' }),
  ]
  data.shopping = [item({ productId: 'c' })]
  renderIt()
  const titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
  expect(titles).toEqual(['🔴 Falta (1)', '🟠 Talvez falte (1)', '🟢 Há (1)'])
  expect(screen.getAllByText('Limpeza').some(el => el.className === 'zone-tag')).toBe(true) // zone shown small on each row
  expect(screen.getByRole('button', { name: 'Ainda há Detergente' })).toBeTruthy()
})

test('"Comprei" offers to record the spending without forcing it', () => {
  data.products = [prod({ id: 'c', name: 'Café' })]
  data.shopping = [item({ productId: 'c' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Comprei Café' }))
  fireEvent.click(screen.getByRole('button', { name: 'Registar gasto' }))
  fireEvent.change(screen.getByPlaceholderText(/47,30/), { target: { value: '3,20' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registar' }))
  expect(exp.addExpense).toHaveBeenCalledWith(320, 'P', '2026-10-29')
})

test('Congelador products show their bags instead of a rhythm', () => {
  data.products = [prod({ id: 'v', name: 'Vaca', location: 'congelador', boughtKeys: ['2026-10-01'] })]
  data.bags = [bag({ productId: 'v', amount: 1, unit: 'kg' }), bag({ productId: 'v', amount: 1, unit: 'kg' })]
  renderIt()
  expect(screen.getByText('2 sacos · 2 kg')).toBeTruthy()
  expect(screen.queryByText(/a aprender/)).toBeNull()
})

test('a bought Congelador product with no bags is 🟠 Talvez falte, "não há no congelador"', () => {
  data.products = [prod({ id: 'v', name: 'Vaca', location: 'congelador', boughtKeys: ['2026-10-01'] })]
  renderIt()
  expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('🟠 Talvez falte (1)')
  expect(screen.getByText('não há no congelador')).toBeTruthy()
})

test('Comprei on a Congelador product records the purchase and opens Para o congelador', () => {
  data.products = [prod({ id: 'v', name: 'Vaca', location: 'congelador' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Comprei Vaca' }))
  expect(repo.boughtOutside).toHaveBeenCalled()
  expect(screen.getByText(/Para o congelador/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
  expect(screen.queryByText(/Para o congelador/)).toBeNull()
  expect(repo.undoBought).not.toHaveBeenCalled()
})

test('Comprei on other zones does not open Para o congelador', () => {
  data.products = [prod({ id: 'c', name: 'Café' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Comprei Café' }))
  expect(screen.queryByText(/Para o congelador/)).toBeNull()
})

test('Editar lets a Congelador product switch between Carne / peixe and Outros', () => {
  data.products = [prod({ id: 'g', name: 'Gelado', location: 'congelador' }), prod({ id: 'c', name: 'Café' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  expect((screen.getByLabelText('Tipo de Gelado') as HTMLSelectElement).value).toBe('outros')
  expect(screen.queryByLabelText('Tipo de Café')).toBeNull()
  fireEvent.change(screen.getByLabelText('Tipo de Gelado'), { target: { value: 'carne' } })
  expect(repo.setFreezerCategory).toHaveBeenCalledWith(expect.objectContaining({ id: 'g' }), 'carne')
})

test('Desfazer after Comprei closes an unanswered Para o congelador', () => {
  data.products = [prod({ id: 'v', name: 'Vaca', location: 'congelador' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Comprei Vaca' }))
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(repo.undoBought).toHaveBeenCalled()
  expect(screen.queryByText(/Para o congelador/)).toBeNull()
})
