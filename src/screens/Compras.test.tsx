import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Compras from './Compras'
import { item, part, prod } from '../domain/testFactories'
import type { FreezerBag, Product, ShoppingItem, Trip } from '../domain/types'

const data = vi.hoisted(() => ({ shopping: [] as ShoppingItem[], products: [] as Product[], bags: [] as FreezerBag[], meta: [] as { id: string }[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) =>
    (path === 'shopping' ? data.shopping : path === 'products' ? data.products : path === 'freezerBags' ? data.bags : path === 'meta' ? data.meta : []),
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
const repo = vi.hoisted(() => ({
  addItem: vi.fn(), toggleCart: vi.fn(), deleteItem: vi.fn(), undoFinish: vi.fn(),
  classifyItem: vi.fn(), markMissing: vi.fn(), snooze: vi.fn(),
  addPart: vi.fn(), removePart: vi.fn(), clearParts: vi.fn(), ensureMeatProduct: vi.fn(),
  finish: vi.fn(() => ({ items: [], products: [], purchaseIds: {} as Record<string, string> })),
}))
vi.mock('../data/shoppingRepo', () => repo)
vi.mock('../data/restore', () => ({ restore: vi.fn() }))
const trips = vi.hoisted(() => ({ startTrip: vi.fn(), changeStore: vi.fn(), leaveTrip: vi.fn(), restoreTrip: vi.fn(), addCustomStore: vi.fn() }))
vi.mock('../data/tripRepo', () => trips)
const exp = vi.hoisted(() => ({ addExpense: vi.fn() }))
vi.mock('../data/expensesRepo', () => exp)
const frozen = { bagIds: ['b1', 'b2'], previous: [] }
const freezer = vi.hoisted(() => ({ freezeBought: vi.fn((): unknown => null), undoFreeze: vi.fn() }))
vi.mock('../data/freezerRepo', () => freezer)

const renderIt = () => render(<MemoryRouter><Compras /></MemoryRouter>)
beforeEach(() => { vi.clearAllMocks(); data.products = []; data.bags = []; data.meta = []; freezer.freezeBought.mockReturnValue(frozen) })
/** "Terminar compras"; with untagged ticks and no trip it first asks "Onde foi?", answered with "Não digo". */
function terminar() {
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  const none = screen.queryByRole('button', { name: 'Não digo' })
  if (none) fireEvent.click(none)
}

test('"Terminar compras" only appears with something in the cart', () => {
  data.shopping = [item({ text: 'Café', status: 'porComprar' })]
  const { unmount } = renderIt()
  expect(screen.queryByRole('button', { name: /Terminar compras/ })).toBeNull()
  unmount()

  data.shopping = [item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  expect(screen.getByRole('button', { name: /Terminar compras/ })).toBeTruthy()
})

test('an empty list says so in words, with no emoji', () => {
  data.shopping = []
  renderIt()
  expect(screen.getByText('Nada por comprar')).toBeTruthy()
})

test('shows who added each item', () => {
  data.shopping = [item({ text: 'Natas', addedBy: 'B', oneOff: true })]
  renderIt()
  expect(screen.getByRole('img', { name: 'Rui' })).toBeTruthy()
})

test('the header counts what is left to buy and what is in the cart', () => {
  data.shopping = [item({ text: 'Café' }), item({ text: 'Ovos' }), item({ text: 'Leite', status: 'carrinho' })]
  renderIt()
  expect(screen.getByText('2 por comprar · 1 no carrinho')).toBeTruthy()
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

test('the card titles are level-2 headings and the zone titles stay level 3', () => {
  data.products = [prod({ id: 'l', location: 'frigorifico' }), prod({ id: 'm', name: 'Manteiga', location: 'frigorifico', boughtKeys: ['2026-10-01', '2026-10-11'] })]
  data.shopping = [item({ text: 'Leite', productId: 'l' }), item({ text: 'Pão', status: 'carrinho' })]
  renderIt()
  const h2 = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
  expect(h2).toEqual(['Por comprar 1', 'Talvez falte 1'])
  expect(screen.getByRole('heading', { level: 3, name: 'Frigorífico' })).toBeTruthy()
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
  fireEvent.click(screen.getByRole('button', { name: 'Falta Café' }))
  expect(repo.markMissing).toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Ainda há Café' }))
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
  terminar()
  fireEvent.change(screen.getByPlaceholderText(/47,30/), { target: { value: '47,30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registar' }))
  expect(exp.addExpense).toHaveBeenCalledWith(4730, 'P', '2026-10-29')
  expect(screen.queryByText(/Quanto foi/)).toBeNull()
})

test('the "how much" question appears where the cart was, not at the top of the screen', () => {
  data.shopping = [item({ text: 'Ovos', status: 'porComprar', oneOff: true }), item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  terminar()
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
  terminar()
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
  terminar()
  expect(screen.queryByText(/Para o congelador/)).toBeNull()
  expect(screen.getByText(/Quanto foi/)).toBeTruthy()
})

test('Desfazer after saving the freezer card also deletes the new bags', () => {
  freezerCart()
  renderIt()
  terminar()
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
  terminar()
  fireEvent.change(screen.getByLabelText('Quantidade de Carne de vaca'), { target: { value: '5' } })
  data.products = [...data.products, prod({ id: 'g', name: 'Gelado', location: 'congelador' })]
  data.shopping = [item({ text: 'Gelado', status: 'carrinho', productId: 'g' })]
  rerender(<MemoryRouter><Compras /></MemoryRouter>)
  terminar()
  expect((screen.getByLabelText('Quantidade de Carne de vaca') as HTMLInputElement).value).toBe('5')
  expect(screen.getByLabelText('Quantidade de Gelado')).toBeTruthy()
})

const lidl: Trip = { id: 'trip', store: 'Lidl', stores: ['Lidl'], startedBy: 'P', dateKey: '2026-10-29' }

test('"Iniciar compras" asks where and starts the trip', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar compras' }))
  expect(screen.getByText('Onde foi?')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Não digo' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Lidl' }))
  expect(trips.startTrip).toHaveBeenCalledWith('Lidl', 'P', '2026-10-29')
})

test('with an active trip the tick takes the store', () => {
  data.meta = [lidl]
  data.shopping = [item({ text: 'Café' })]
  renderIt()
  expect(screen.getByText('No Lidl · 0 no carrinho')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Café' }))
  expect(repo.toggleCart).toHaveBeenCalledWith(expect.objectContaining({ text: 'Café' }), 'Lidl')
})

test("yesterday's trip counts as no trip and is left once, quietly", () => {
  data.meta = [{ ...lidl, dateKey: '2026-10-28' } as Trip]
  data.shopping = [item({ text: 'Café' })]
  const { rerender } = renderIt()
  expect(screen.getByRole('button', { name: 'Iniciar compras' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Café' }))
  expect(repo.toggleCart).toHaveBeenCalledWith(expect.objectContaining({ text: 'Café' }), undefined)
  rerender(<MemoryRouter><Compras /></MemoryRouter>)
  expect(trips.leaveTrip).toHaveBeenCalledTimes(1)
})

test('"Mudar de loja" changes the store of the trip', () => {
  data.meta = [lidl]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Mudar de loja' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continente' }))
  expect(trips.changeStore).toHaveBeenCalledWith(expect.objectContaining({ store: 'Lidl' }), 'Continente')
})

test('"Sair" leaves the trip and offers undo', () => {
  data.meta = [lidl]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
  expect(trips.leaveTrip).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(trips.restoreTrip).toHaveBeenCalledWith(expect.objectContaining({ store: 'Lidl' }))
})

test('"Cancelar" closes the store picker without writing', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar compras' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByText('Onde foi?')).toBeNull()
  expect(trips.startTrip).not.toHaveBeenCalled()
})

test('a ticked item keeps its place in the zone and there is no "No carrinho" card', () => {
  data.products = ['a', 'c', 'l'].map(id => prod({ id, location: 'despensa' }))
  data.shopping = [
    item({ text: 'Leite', productId: 'l' }), item({ text: 'Arroz', status: 'carrinho', productId: 'a' }), item({ text: 'Café', productId: 'c' }),
  ]
  renderIt()
  const names = ['Arroz', 'Café', 'Leite']
  const order = screen.getAllByRole('button').map(b => b.getAttribute('aria-label')).filter(n => names.includes(n ?? ''))
  expect(order).toEqual(names)
  expect(screen.queryByRole('heading', { name: 'No carrinho' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Arroz' }))
  expect(repo.toggleCart).toHaveBeenCalledWith(expect.objectContaining({ text: 'Arroz' }), undefined)
})

test('tapping a meat item asks what goes in instead of ticking it, one card at a time', () => {
  data.products = [
    prod({ id: 'c', name: 'Carne', location: 'congelador', freezerCategory: 'carne' }),
    prod({ id: 'x', name: 'Peixe', location: 'congelador', freezerCategory: 'carne' }),
    prod({ id: 'e', name: 'Ervilhas', location: 'congelador', freezerCategory: 'outros' }),
  ]
  data.shopping = [item({ text: 'Carne', productId: 'c' }), item({ text: 'Peixe', productId: 'x' }), item({ text: 'Ervilhas', productId: 'e' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Carne' }))
  expect(screen.getByRole('heading', { name: 'Carne — o que levas?' })).toBeTruthy()
  expect(repo.toggleCart).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Peixe' }))
  expect(screen.queryByRole('heading', { name: 'Carne — o que levas?' })).toBeNull()
  expect(screen.getByRole('heading', { name: 'Peixe — o que levas?' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Ervilhas' }))
  expect(repo.toggleCart).toHaveBeenCalledWith(expect.objectContaining({ text: 'Ervilhas' }), undefined)
})

test('a ticked meat item says what is already in the cart', () => {
  data.products = [prod({ id: 'c', name: 'Carne', location: 'congelador', freezerCategory: 'carne' })]
  data.shopping = [item({ text: 'Carne', productId: 'c', status: 'carrinho', parts: [
    part({ name: 'Vaca', amount: 3, unit: 'kg' }), part({ name: 'Vazia', amount: 1, unit: 'kg' }),
  ] })]
  renderIt()
  expect(screen.getByText('Já levas: 3 kg Vaca · 1 kg Vazia')).toBeTruthy()
})

test('finishing a trip with two stores asks "quanto foi?" for each, in trip order, with the store', () => {
  data.meta = [{ ...lidl, store: 'Continente', stores: ['Lidl', 'Continente'] } as Trip]
  data.shopping = [item({ text: 'Leite', status: 'carrinho', store: 'Continente' }), item({ text: 'Café', status: 'carrinho', store: 'Lidl' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  expect(screen.queryByText('Onde foi?')).toBeNull()
  expect(repo.finish).toHaveBeenCalledWith(data.shopping, [], expect.objectContaining({ stores: ['Lidl', 'Continente'] }), '2026-10-29',
    expect.objectContaining({ store: 'Continente' }))
  expect(screen.getByRole('heading', { name: 'Lidl — quanto foi?' })).toBeTruthy()
  fireEvent.change(screen.getByPlaceholderText(/47,30/), { target: { value: '12' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registar' }))
  expect(exp.addExpense).toHaveBeenCalledWith(1200, 'P', '2026-10-29', undefined, 'Lidl')
  expect(screen.getByRole('heading', { name: 'Continente — quanto foi?' })).toBeTruthy()
  // a fresh form for the next store: nothing typed carries over
  expect((screen.getByPlaceholderText(/47,30/) as HTMLInputElement).value).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
  expect(screen.queryByText(/quanto foi/i)).toBeNull()
})

test('finishing without a trip asks "Onde foi?" and the answer names the store of the purchases and the expense', () => {
  data.shopping = [item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  expect(repo.finish).not.toHaveBeenCalled()
  expect(screen.getByRole('heading', { name: 'Onde foi?' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Aldi' }))
  const plan = (repo.finish.mock.calls[0] as unknown[])[2] as { purchases: { row: { store?: string } }[] }
  expect(plan.purchases[0].row.store).toBe('Aldi')
  expect(screen.queryByText('Onde foi?')).toBeNull()
  expect(screen.getByRole('heading', { name: 'Aldi — quanto foi?' })).toBeTruthy()
})

test('"Cancelar" on "Onde foi?" does not finish', () => {
  data.shopping = [item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByText('Onde foi?')).toBeNull()
  expect(repo.finish).not.toHaveBeenCalled()
})

test('the note under "Terminar" names the meat types, not the generic item', () => {
  data.products = [
    prod({ id: 'c', name: 'Carne', location: 'congelador', freezerCategory: 'carne' }),
    prod({ id: 'v', name: 'Vaca', location: 'congelador', freezerCategory: 'carne' }),
  ]
  data.shopping = [item({ text: 'Carne', productId: 'c', status: 'carrinho', parts: [part({ productId: 'v', name: 'Vaca', amount: 1, unit: 'kg' })] })]
  renderIt()
  expect(screen.getByText(/registado em Casa que compraram: Vaca\./)).toBeTruthy()
})

test('"Onde foi?" from "Terminar" goes away when the cart empties (finished on the other phone)', () => {
  data.shopping = [item({ text: 'Café', status: 'carrinho' })]
  const { rerender } = renderIt()
  fireEvent.click(screen.getByRole('button', { name: /Terminar compras/ }))
  expect(screen.getByText('Onde foi?')).toBeTruthy()
  data.shopping = []
  rerender(<MemoryRouter><Compras /></MemoryRouter>)
  expect(screen.queryByText('Onde foi?')).toBeNull()
  // ticking again later shows "Terminar compras", not the old question
  data.shopping = [item({ text: 'Leite', status: 'carrinho' })]
  rerender(<MemoryRouter><Compras /></MemoryRouter>)
  expect(screen.queryByText('Onde foi?')).toBeNull()
  expect(screen.getByRole('button', { name: /Terminar compras/ })).toBeTruthy()
})

test('the freezer rows come from the plan: pre-filled from each part, tied to its purchase, a gone product skipped', () => {
  data.products = [prod({ id: 'v', name: 'Vaca', location: 'congelador', freezerCategory: 'carne' })]
  data.shopping = [item({ id: 'i', productId: 'v', status: 'carrinho', parts: [
    part({ id: 'a', productId: 'v', name: 'Vaca', amount: 3, unit: 'kg' }),
    part({ id: 'b', productId: 'v', name: 'Vaca', amount: 1.5, unit: 'kg' }),
    part({ id: 'c', productId: 'gone', name: 'Peixe', amount: 2, unit: 'kg' }),
  ] })]
  repo.finish.mockReturnValueOnce({ items: [], products: [], purchaseIds: { a: 'pu1', b: 'pu2', c: 'pu3' } })
  renderIt()
  terminar()
  expect((screen.getByLabelText('Quantidade de Vaca (1 de 2)') as HTMLInputElement).value).toBe('3')
  expect((screen.getByLabelText('Quantidade de Vaca (2 de 2)') as HTMLInputElement).value).toBe('1,5')
  expect(screen.queryByLabelText(/Peixe/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(freezer.freezeBought).toHaveBeenCalledWith([
    expect.objectContaining({ amount: 3, unit: 'kg', purchaseId: 'pu1' }),
    expect.objectContaining({ amount: 1.5, unit: 'kg', purchaseId: 'pu2' }),
  ], '2026-10-29')
})
