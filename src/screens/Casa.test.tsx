import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Casa from './Casa'
import { item, prod } from '../domain/testFactories'
import type { Product, ShoppingItem } from '../domain/types'

const data = vi.hoisted(() => ({ shopping: [] as ShoppingItem[], products: [] as Product[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) => (path === 'shopping' ? data.shopping : path === 'products' ? data.products : []),
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
const repo = vi.hoisted(() => ({
  addProduct: vi.fn(), deleteProduct: vi.fn(), renameProduct: vi.fn(), moveProduct: vi.fn(),
  markMissing: vi.fn(), undoBought: vi.fn(),
  boughtOutside: vi.fn((p: unknown) => ({ product: p, items: [] })),
}))
vi.mock('../data/shoppingRepo', () => repo)
vi.mock('../data/restore', () => ({ restore: vi.fn() }))

const renderIt = () => render(<MemoryRouter><Casa /></MemoryRouter>)
beforeEach(() => { vi.clearAllMocks(); data.products = []; data.shopping = [] })

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

test('Falta is disabled when the product is already on the list', () => {
  data.products = [prod({ id: 'c', name: 'Café' })]
  data.shopping = [item({ productId: 'c' })]
  renderIt()
  expect((screen.getByRole('button', { name: 'Café na lista' }) as HTMLButtonElement).disabled).toBe(true)
})
