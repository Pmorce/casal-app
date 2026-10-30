import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Congelador from './Congelador'
import { bag, prod } from '../domain/testFactories'
import type { FreezerBag, Product, ShoppingItem } from '../domain/types'

const data = vi.hoisted(() => ({ shopping: [] as ShoppingItem[], products: [] as Product[], bags: [] as FreezerBag[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) =>
    (path === 'shopping' ? data.shopping : path === 'products' ? data.products : path === 'freezerBags' ? data.bags : []),
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
const freezer = vi.hoisted(() => ({
  addBags: vi.fn(), addSameAsLast: vi.fn(), deleteBag: vi.fn(), restoreBag: vi.fn(), updateBag: vi.fn(),
  removeOldest: vi.fn((g: { bags: FreezerBag[] }) => g.bags[0]),
  splitBag: vi.fn((_b: FreezerBag, amounts: number[]) => amounts.map((_, i) => `s${i}`)),
  deleteBags: vi.fn(),
}))
vi.mock('../data/freezerRepo', () => freezer)
const shop = vi.hoisted(() => ({ addItem: vi.fn(), markMissing: vi.fn(), snooze: vi.fn() }))
vi.mock('../data/shoppingRepo', () => shop)

const renderIt = () => render(<MemoryRouter><Congelador /></MemoryRouter>)
beforeEach(() => { vi.clearAllMocks(); data.products = []; data.shopping = []; data.bags = [] })

const openSplit = (name: string) => {
  fireEvent.click(screen.getByText(name))
  fireEvent.click(screen.getByRole('button', { name: 'Dividir' }))
}

test('three tabs, Outros shows its bags', () => {
  data.bags = [bag({ name: 'Gelado', category: 'outros' }), bag({ name: 'Bifes', category: 'carne' })]
  renderIt()
  expect(screen.queryByText('Gelado')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Outros' }))
  expect(screen.getByText('Gelado')).toBeTruthy()
  expect(screen.queryByText('Bifes')).toBeNull()
})

test('Novo saco offers the three categories', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: '+ Novo saco' }))
  expect(screen.getAllByRole('button', { name: 'Outros' })).toHaveLength(2)
})

test('Dividir 5 kg defaults to 5 bags of 1 kg, with undo', () => {
  const b = bag({ name: 'Vaca', amount: 5, unit: 'kg' })
  data.bags = [b]
  renderIt()
  openSplit('Vaca')
  expect((screen.getByLabelText('Quantidade por saco') as HTMLInputElement).value).toBe('1')
  fireEvent.click(screen.getByRole('button', { name: 'Dividir em 5' }))
  expect(freezer.splitBag).toHaveBeenCalledWith(b, [1, 1, 1, 1, 1])
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(freezer.deleteBags).toHaveBeenCalledWith(['s0', 's1', 's2', 's3', 's4'])
  expect(freezer.restoreBag).toHaveBeenCalledWith(b)
})

test('Dividir 1 kg in 3 keeps the total', () => {
  const b = bag({ name: 'Vaca', amount: 1, unit: 'kg' })
  data.bags = [b]
  renderIt()
  openSplit('Vaca')
  fireEvent.click(screen.getByRole('button', { name: 'Mais sacos' }))
  expect((screen.getByLabelText('Quantidade por saco') as HTMLInputElement).value).toBe('0,33')
  fireEvent.click(screen.getByRole('button', { name: 'Dividir em 3' }))
  expect(freezer.splitBag).toHaveBeenCalledWith(b, [0.33, 0.33, 0.34])
})

test('an edited amount per bag gives equal bags; an invalid one is refused', () => {
  const b = bag({ name: 'Vaca', amount: 1, unit: 'kg' })
  data.bags = [b]
  renderIt()
  openSplit('Vaca')
  fireEvent.change(screen.getByLabelText('Quantidade por saco'), { target: { value: 'x' } })
  fireEvent.click(screen.getByRole('button', { name: 'Dividir em 2' }))
  expect(screen.getByText('Quantidade inválida')).toBeTruthy()
  expect(freezer.splitBag).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Quantidade por saco'), { target: { value: '0,5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Mais sacos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Dividir em 3' }))
  expect(freezer.splitBag).toHaveBeenCalledWith(b, [0.5, 0.5, 0.5])
})

test('last bag of a linked product: Sim puts that product on the list', () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  data.products = [v]
  data.bags = [bag({ name: 'Vaca', productId: 'v' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Tirar um saco de Vaca' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sim' }))
  expect(shop.markMissing).toHaveBeenCalledWith(v, 'P', [])
  expect(shop.addItem).not.toHaveBeenCalled()
})

test('last bag of a linked product: Não snoozes the suggestion', () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  data.products = [v]
  data.bags = [bag({ name: 'Vaca', productId: 'v' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Tirar um saco de Vaca' }))
  fireEvent.click(screen.getByRole('button', { name: 'Não' }))
  expect(shop.snooze).toHaveBeenCalledWith(v, '2026-10-29')
})

test('last bag with no product still adds the name to the list', () => {
  data.bags = [bag({ name: 'Sopa', category: 'carne' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Tirar um saco de Sopa' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sim' }))
  expect(shop.addItem).toHaveBeenCalledWith('Sopa', 'P', [], [], 'despensa')
})
