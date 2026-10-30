import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Congelador from './Congelador'
import { bag, item, prod } from '../domain/testFactories'
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
  fireEvent.click(screen.getByRole('button', { name: /^Dividir o saco 1/ }))
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

const lastBagOfVaca = () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  data.products = [v]
  data.bags = [bag({ name: 'Vaca', productId: 'v' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Tirar um saco de Vaca' }))
  return v
}

test('the last bag shows "Acabou X" in the bottom toast, not a card at the top', () => {
  lastBagOfVaca()
  expect(screen.getByText('Acabou Vaca').closest('.toast')).toBeTruthy()
  expect(screen.queryByText(/Adicionar à lista de compras\?/)).toBeNull()
})

test('last bag of a linked product: "Pôr na lista" puts that product on the list', () => {
  const v = lastBagOfVaca()
  fireEvent.click(screen.getByRole('button', { name: 'Pôr na lista' }))
  expect(shop.markMissing).toHaveBeenCalledWith(v, 'P', [])
  expect(shop.addItem).not.toHaveBeenCalled()
})

test('last bag of a linked product: ✕ snoozes the suggestion', () => {
  const v = lastBagOfVaca()
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
  expect(shop.snooze).toHaveBeenCalledWith(v, '2026-10-29')
  expect(shop.markMissing).not.toHaveBeenCalled()
})

test('Desfazer on "Acabou X" puts the bag back and asks nothing else', () => {
  lastBagOfVaca()
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(freezer.restoreBag).toHaveBeenCalled()
  expect(shop.markMissing).not.toHaveBeenCalled()
  expect(shop.snooze).not.toHaveBeenCalled()
})

test('a bag that is not the last keeps the plain "Saco retirado" toast', () => {
  data.bags = [bag({ name: 'Vaca' }), bag({ name: 'Vaca' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Tirar um saco de Vaca' }))
  expect(screen.getByText('Saco retirado')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Pôr na lista' })).toBeNull()
})

test('last bag with no product still adds the name to the list', () => {
  data.bags = [bag({ name: 'Sopa', category: 'carne' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Tirar um saco de Sopa' }))
  fireEvent.click(screen.getByRole('button', { name: 'Pôr na lista' }))
  expect(shop.addItem).toHaveBeenCalledWith('Sopa', 'P', [], [], 'despensa')
})

test('each bag has its own button names (screen readers)', () => {
  data.bags = [bag({ name: 'Vaca', amount: 1, unit: 'kg', addedKey: '2026-10-29' }), bag({ name: 'Vaca', amount: 1, unit: 'kg', addedKey: '2026-10-29' })]
  renderIt()
  fireEvent.click(screen.getByText('Vaca'))
  for (const verb of ['Corrigir', 'Dividir', 'Apagar']) {
    expect(screen.getByRole('button', { name: `${verb} o saco 1 (1 kg, entrou hoje)` })).toBeTruthy()
    expect(screen.getByRole('button', { name: `${verb} o saco 2 (1 kg, entrou hoje)` })).toBeTruthy()
  }
})

test('a typed amount per bag shows the new total when it differs', () => {
  data.bags = [bag({ name: 'Vaca', amount: 1, unit: 'kg' })]
  renderIt()
  openSplit('Vaca')
  expect(screen.queryByText(/Total/)).toBeNull()
  fireEvent.change(screen.getByLabelText('Quantidade por saco'), { target: { value: '0,4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Mais sacos' }))
  expect(screen.getByText('Total: 1,2 kg (era 1 kg)')).toBeTruthy()
})

test('tiny amounts cannot be split into more bags than hundredths', () => {
  const b = bag({ name: 'Sal', amount: 0.03, unit: 'kg' })
  data.bags = [b]
  renderIt()
  openSplit('Sal')
  fireEvent.click(screen.getByRole('button', { name: 'Mais sacos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mais sacos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Dividir em 3' }))
  expect(freezer.splitBag).toHaveBeenCalledWith(b, [0.01, 0.01, 0.01])
})

test('a bag of 0,01 offers no Dividir', () => {
  data.bags = [bag({ name: 'Sal', amount: 0.01, unit: 'kg' })]
  renderIt()
  fireEvent.click(screen.getByText('Sal'))
  expect(screen.queryByRole('button', { name: /^Dividir/ })).toBeNull()
})

test('if the split is refused, it says so instead of doing nothing', () => {
  freezer.splitBag.mockImplementationOnce(() => { throw new Error('Quantidade inválida') })
  data.bags = [bag({ name: 'Vaca', amount: 2, unit: 'kg' })]
  renderIt()
  openSplit('Vaca')
  fireEvent.click(screen.getByRole('button', { name: 'Dividir em 2' }))
  expect(screen.getByText('Não foi possível dividir: Quantidade inválida')).toBeTruthy()
})

test('"Pôr na lista" uses the list as it is now, not as it was when the bag was taken out', () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  data.products = [v]
  data.bags = [bag({ name: 'Vaca', productId: 'v' })]
  const { rerender } = renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Tirar um saco de Vaca' }))
  const added = item({ text: 'Vaca', productId: 'v' })
  data.shopping = [added] // the other phone tapped "Falta" meanwhile
  rerender(<MemoryRouter><Congelador /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Pôr na lista' }))
  expect(shop.markMissing).toHaveBeenCalledWith(v, 'P', [added])
})
