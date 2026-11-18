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
  cook: vi.fn(() => ({ bagIds: ['c1'] })), undoCook: vi.fn(),
  moveToFridge: vi.fn(), backToFreezer: vi.fn(), undoOrigin: vi.fn(),
  addFromOrigin: vi.fn(() => ({ bagId: 'nb' })),
}))
vi.mock('../data/freezerRepo', () => freezer)
const shop = vi.hoisted(() => ({ addItem: vi.fn(), markMissing: vi.fn(), snooze: vi.fn() }))
vi.mock('../data/shoppingRepo', () => shop)
const trips = vi.hoisted(() => ({ addCustomStore: vi.fn() }))
vi.mock('../data/tripRepo', () => trips)

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

test('the header counts every bag and the groups to use first, in all categories', () => {
  data.bags = [
    bag({ name: 'Bifes', addedKey: '2026-06-01' }), bag({ name: 'Bifes', addedKey: '2026-10-20' }),
    bag({ name: 'Sopa', category: 'feita', addedKey: '2026-05-01' }), bag({ name: 'Gelado', category: 'outros' }),
  ]
  const { unmount } = renderIt()
  expect(screen.getByText('4 sacos · 2 para gastar primeiro')).toBeTruthy()
  unmount()
  data.bags = [bag({ name: 'Gelado', category: 'outros', addedKey: '2026-10-20' })]
  renderIt()
  expect(screen.getByText('1 saco')).toBeTruthy()
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
  expect((screen.getByLabelText('Saco 1 (kg)') as HTMLInputElement).value).toBe('1')
  expect(screen.getByText('1 kg (o resto)')).toBeTruthy()
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
  expect((screen.getByLabelText('Saco 2 (kg)') as HTMLInputElement).value).toBe('0,33')
  expect(screen.getByText('0,34 kg (o resto)')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Dividir em 3' }))
  expect(freezer.splitBag).toHaveBeenCalledWith(b, [0.33, 0.33, 0.34])
})

test('Dividir in different weights: 3 kg as 1 kg + 0,6 kg, the last bag takes the rest (1,4 kg)', () => {
  const b = bag({ name: 'Porco', amount: 3, unit: 'kg' })
  data.bags = [b]
  renderIt()
  openSplit('Porco')
  expect(screen.queryByLabelText('Saco 3 (kg)')).toBeNull()
  fireEvent.change(screen.getByLabelText('Saco 1 (kg)'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Saco 2 (kg)'), { target: { value: '0,6' } })
  expect(screen.getByText('1,4 kg (o resto)')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Dividir em 3' }))
  expect(freezer.splitBag).toHaveBeenCalledWith(b, [1, 0.6, 1.4])
})

test('Dividir never goes over the total: the button turns off and says why', () => {
  const b = bag({ name: 'Porco', amount: 3, unit: 'kg' })
  data.bags = [b]
  renderIt()
  openSplit('Porco')
  fireEvent.change(screen.getByLabelText('Saco 1 (kg)'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Saco 2 (kg)'), { target: { value: '1,5' } })
  expect(screen.getByText('Passa do total (3 kg)')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Dividir em 3' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Saco 2 (kg)'), { target: { value: 'x' } })
  expect(screen.getByText('Quantidade inválida')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Dividir em 3' }) as HTMLButtonElement).disabled).toBe(true)
  expect(freezer.splitBag).not.toHaveBeenCalled()
})

/** "−" opens "Para onde vai?"; then one of its options. */
const takeOut = (name: string, option: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Tirar um saco de ${name}` }))
  fireEvent.click(screen.getByRole('button', { name: option }))
}

const lastBagOfVaca = () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  data.products = [v]
  data.bags = [bag({ name: 'Vaca', productId: 'v' })]
  renderIt()
  takeOut('Vaca', 'Acabou / deitar fora')
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
  takeOut('Vaca', 'Acabou / deitar fora')
  expect(screen.getByText('Saco retirado')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Pôr na lista' })).toBeNull()
})

test('last bag with no product still adds the name to the list', () => {
  data.bags = [bag({ name: 'Sopa', category: 'carne' })]
  renderIt()
  takeOut('Sopa', 'Acabou / deitar fora')
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
  takeOut('Vaca', 'Acabou / deitar fora')
  const added = item({ text: 'Vaca', productId: 'v' })
  data.shopping = [added] // the other phone tapped "Falta" meanwhile
  rerender(<MemoryRouter><Congelador /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Pôr na lista' }))
  expect(shop.markMissing).toHaveBeenCalledWith(v, 'P', [added])
})

test('NovoSaco stepper buttons are named for the bags being stored, and the count is a live region', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: '+ Novo saco' }))
  expect(screen.getByRole('button', { name: 'Menos sacos a guardar' })).toBeTruthy()
  const more = screen.getByRole('button', { name: 'Mais sacos a guardar' })
  expect(more.previousElementSibling?.getAttribute('aria-live')).toBe('polite')
  expect(screen.queryByRole('button', { name: 'Mais um saco' })).toBeNull()
})

test('the group stepper and the SplitBag stepper counts are live regions', () => {
  data.bags = [bag({ name: 'Vaca', amount: 5, unit: 'kg' })]
  renderIt()
  openSplit('Vaca')
  expect(screen.getByRole('button', { name: 'Mais sacos' }).previousElementSibling?.getAttribute('aria-live')).toBe('polite')
  expect(screen.getByRole('button', { name: 'Mais um saco de Vaca' }).previousElementSibling?.getAttribute('aria-live')).toBe('polite')
})

test('the group stepper live region announces the count with its product', () => {
  data.bags = [bag({ name: 'Vaca', amount: 5, unit: 'kg' }), bag({ name: 'Vaca', amount: 3, unit: 'kg' })]
  renderIt()
  const live = screen.getByRole('button', { name: 'Mais um saco de Vaca' }).previousElementSibling!
  expect(live.getAttribute('aria-atomic')).toBe('true')
  expect(live.querySelector('.sr-only')?.textContent).toBe('2 sacos de Vaca')
  expect(live.querySelector('[aria-hidden="true"]')?.textContent).toBe('2')
})

test('the group stepper live region says «1 saco» in the singular', () => {
  data.bags = [bag({ name: 'Bolonhesa', amount: 5, unit: 'kg' })]
  renderIt()
  const live = screen.getByRole('button', { name: 'Mais um saco de Bolonhesa' }).previousElementSibling!
  expect(live.querySelector('.sr-only')?.textContent).toBe('1 saco de Bolonhesa')
})

test('"−" → Descongelar moves the oldest bag to the fridge; Desfazer brings it back to the freezer', () => {
  const old = bag({ name: 'Vaca', addedKey: '2026-05-01' })
  data.bags = [bag({ name: 'Vaca', addedKey: '2026-10-01' }), old]
  renderIt()
  takeOut('Vaca', 'Descongelar')
  expect(freezer.moveToFridge).toHaveBeenCalledWith(old, '2026-10-29')
  expect(freezer.removeOldest).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(freezer.backToFreezer).toHaveBeenCalledWith(old)
  expect(freezer.restoreBag).not.toHaveBeenCalled()
})

test('"Para onde vai?" offers its options and Cancelar does nothing', () => {
  data.bags = [bag({ name: 'Vaca' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Tirar um saco de Vaca' }))
  expect(screen.getByText('Para onde vai?')).toBeTruthy()
  for (const o of ['Descongelar', 'Cozinhar já', 'Acabou / deitar fora']) expect(screen.getByRole('button', { name: o })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByText('Para onde vai?')).toBeNull()
  expect(freezer.moveToFridge).not.toHaveBeenCalled()
  expect(freezer.removeOldest).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull()
})

test('"−" on the only bag → Descongelar also says "Acabou Vaca" with "Pôr na lista"; Desfazer brings it back to the freezer', () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  const only = bag({ name: 'Vaca', productId: 'v' })
  data.products = [v]
  data.bags = [only]
  renderIt()
  takeOut('Vaca', 'Descongelar')
  expect(screen.getByText('Acabou Vaca').closest('.toast')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(freezer.backToFreezer).toHaveBeenCalledWith(only)
  expect(freezer.restoreBag).not.toHaveBeenCalled()
})

test('"−" on the only bag → Descongelar: "Pôr na lista" puts the product on the list', () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  data.products = [v]
  data.bags = [bag({ name: 'Vaca', productId: 'v' })]
  renderIt()
  takeOut('Vaca', 'Descongelar')
  fireEvent.click(screen.getByRole('button', { name: 'Pôr na lista' }))
  expect(shop.markMissing).toHaveBeenCalledWith(v, 'P', [])
})

test('"Cozinhar já" opens Cozinhei with that bag; the last-bag question waits for it', () => {
  data.bags = [bag({ name: 'Vaca', amount: 1, unit: 'kg' })]
  renderIt()
  takeOut('Vaca', 'Cozinhar já')
  expect(freezer.removeOldest).not.toHaveBeenCalled()
  expect(screen.getByText('Cozinhei com Vaca 1 kg')).toBeTruthy()
  expect(screen.queryByText('Acabou Vaca')).toBeNull()
  fireEvent.change(screen.getByLabelText('O que fizeste'), { target: { value: 'Estufado' } })
  fireEvent.change(screen.getByLabelText('Para o congelador'), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(freezer.cook).toHaveBeenCalledWith({ name: 'Estufado', freezerDoses: 4, fridgeDoses: 0, madeFrom: 'Vaca 1 kg' }, '2026-10-29', data.bags[0])
  expect(screen.getByText('Acabou Vaca')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(freezer.undoCook).toHaveBeenCalledWith({ bagIds: ['c1'] })
})

test('"Cozinhar já" → Não guardámos nada takes the bag out with undo, and the last one asks for the list', () => {
  data.bags = [bag({ name: 'Vaca' })]
  renderIt()
  takeOut('Vaca', 'Cozinhar já')
  fireEvent.click(screen.getByRole('button', { name: 'Não guardámos nada' }))
  expect(freezer.deleteBag).toHaveBeenCalledWith(data.bags[0].id)
  expect(screen.getByText('Acabou Vaca')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(freezer.restoreBag).toHaveBeenCalled()
})

test('a bag thawing in the fridge is not in the Congelador, nor in the header count', () => {
  data.bags = [
    bag({ name: 'Vaca' }), bag({ name: 'Frango', where: 'frigorifico', movedKey: '2026-10-28' }),
    bag({ name: 'Vaca', where: 'frigorifico', movedKey: '2026-10-28' }),
  ]
  renderIt()
  expect(screen.getByText('1 saco')).toBeTruthy()
  expect(screen.queryByText('Frango')).toBeNull()
  const live = screen.getByRole('button', { name: 'Mais um saco de Vaca' }).previousElementSibling!
  expect(live.querySelector('.sr-only')?.textContent).toBe('1 saco de Vaca')
})

test('"+" → Comprei 3 kg Lidl adds the bag from that purchase, with undo', () => {
  const v = prod({ id: 'v', name: 'Vaca', location: 'congelador' })
  data.products = [v]
  data.bags = [
    bag({ name: 'Vaca', amount: 1, unit: 'kg', productId: 'v', addedKey: '2026-05-01' }),
    bag({ name: 'Vaca', amount: 2, unit: 'kg', productId: 'v' }),
  ]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Mais um saco de Vaca' }))
  expect(screen.getByText('De onde veio?')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Comprei' }).getAttribute('aria-pressed')).toBe('true')
  const amount = screen.getByLabelText('Quantidade (kg)') as HTMLInputElement
  expect(amount.value).toBe('2') // the newest bag
  fireEvent.change(amount, { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lidl' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(freezer.addFromOrigin).toHaveBeenCalledWith(expect.objectContaining({ name: 'Vaca' }), 'comprei', 3, '2026-10-29',
    expect.objectContaining({ uid: 'P', store: 'Lidl', product: v }))
  expect(freezer.addSameAsLast).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(freezer.undoOrigin).toHaveBeenCalledWith({ bagId: 'nb' })
})

test('"+" in Comida feita defaults to Cozinhei and shows no store', () => {
  data.bags = [bag({ name: 'Sopa', category: 'feita', amount: 2, unit: 'doses' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Comida feita' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mais um saco de Sopa' }))
  expect(screen.getByRole('button', { name: 'Cozinhei' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.queryByRole('button', { name: 'Lidl' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(freezer.addFromOrigin).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sopa' }), 'cozinhei', 2, '2026-10-29', { uid: 'P' })
})

test('"+" → Cancelar adds nothing', () => {
  data.bags = [bag({ name: 'Vaca' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Mais um saco de Vaca' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByText('De onde veio?')).toBeNull()
  expect(freezer.addFromOrigin).not.toHaveBeenCalled()
})
