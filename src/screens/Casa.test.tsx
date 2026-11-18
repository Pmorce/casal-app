import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  markMissing: vi.fn(), unmakeGeneric: vi.fn(), undoBought: vi.fn(), snooze: vi.fn(), setFreezerCategory: vi.fn(),
  boughtOutside: vi.fn((p: unknown) => ({ product: p, items: [], purchaseId: 'pu1' })),
}))
vi.mock('../data/shoppingRepo', () => repo)
vi.mock('../data/restore', () => ({ restore: vi.fn() }))
const exp = vi.hoisted(() => ({ addExpense: vi.fn() }))
vi.mock('../data/expensesRepo', () => exp)
const stock = vi.hoisted(() => ({ changeCount: vi.fn(), setCount: vi.fn(), setUncounted: vi.fn(), setLastQty: vi.fn(), setPurchaseQty: vi.fn() }))
vi.mock('../data/stockRepo', () => stock)

/** Opens Casa on a place tab (products default to Despensa). */
const renderIt = (tab = 'Despensa') => {
  const r = render(<MemoryRouter><Casa /></MemoryRouter>)
  fireEvent.click(screen.getByRole('tab', { name: tab }))
  return r
}
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); data.products = []; data.shopping = []; data.bags = [] })

test('each product shows its rhythm and has Falta and Comprei', () => {
  data.products = [prod({ id: 'c', name: 'Café', boughtKeys: ['2026-10-09', '2026-10-19'] })]
  renderIt()
  expect(screen.getByText(/comprado há 10 dias · dura ~10/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Falta Café' }))
  expect(repo.markMissing).toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Comprei Café' }))
  expect(repo.boughtOutside).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }), [], '2026-10-29', 'P')
  expect(screen.getByRole('button', { name: 'Desfazer' })).toBeTruthy()
})

test('Há row: Falta is the main action, Comprei is quieter', () => {
  data.products = [prod({ id: 'a', name: 'Arroz', boughtKeys: ['2026-10-28'] })]
  renderIt()
  expect(screen.getByRole('button', { name: 'Falta Arroz' }).className).toBe('chip line')
  expect(screen.getByRole('button', { name: 'Comprei Arroz' }).className).toBe('chip quiet')
})

test('Falta row: Comprei is the only, main action', () => {
  data.products = [prod({ id: 'c', name: 'Café' })]
  data.shopping = [item({ productId: 'c' })]
  renderIt()
  expect(screen.getByRole('button', { name: 'Comprei Café' }).className).toBe('chip')
  expect(screen.queryByRole('button', { name: 'Falta Café' })).toBeNull()
})

test('Talvez falte row: Falta is the main action, Ainda há is quieter', () => {
  data.products = [prod({ id: 'd', name: 'Detergente', location: 'limpeza', boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'] })]
  renderIt('Limpeza')
  expect(screen.getByRole('button', { name: 'Falta Detergente' }).className).toBe('chip')
  expect(screen.getByRole('button', { name: 'Ainda há Detergente' }).className).toBe('chip quiet')
})

test('products still learning or never bought say so', () => {
  data.products = [prod({ name: 'Arroz', boughtKeys: ['2026-10-01'] }), prod({ name: 'Sal' })]
  renderIt()
  expect(screen.getByText(/a aprender/)).toBeTruthy()
  expect(screen.getByText(/nunca comprado/)).toBeTruthy()
})

test('a product snoozed 3 times says it is no longer suggested', () => {
  data.products = [
    prod({ id: 'c', name: 'Café', boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'], snoozeCount: 3 }),
    prod({ id: 'a', name: 'Arroz', boughtKeys: ['2026-10-01'], snoozeCount: 1 }),
  ]
  renderIt()
  expect(screen.getAllByText(/não sugiro até voltarem a comprar/)).toHaveLength(1)
  expect(screen.getByText(/não sugiro até voltarem a comprar/).closest('.row')?.textContent).toMatch(/Café/)
})

test('the usual duration is shown in whole days', () => {
  data.products = [prod({ name: 'Café', boughtKeys: ['2026-10-01', '2026-10-08', '2026-10-16'] })]
  renderIt()
  expect(screen.getByText(/dura ~8 dias/)).toBeTruthy()
  expect(screen.queryByText(/7[.,]5/)).toBeNull()
})

test('a product snoozed 3 times but now on the list does not say "não sugiro"', () => {
  data.products = [prod({ id: 'c', name: 'Café', boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'], snoozeCount: 3 })]
  data.shopping = [item({ productId: 'c' })]
  renderIt()
  expect(screen.queryByText(/não sugiro/)).toBeNull()
})

test('a generic product is hidden from the states and shown in Editar, where it can stop being generic', () => {
  data.products = [prod({ id: 'carne', name: 'Carne', location: 'congelador', generic: true }), prod({ id: 'c', name: 'Café' })]
  renderIt()
  expect(screen.queryByText('Carne')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  expect(screen.getByDisplayValue('Carne')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Deixar de ser genérico' }))
  expect(repo.unmakeGeneric).toHaveBeenCalledWith(expect.objectContaining({ id: 'carne' }))
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

test('Editar lets a Congelador product switch between Carne / peixe and Outros', () => {
  data.products = [prod({ id: 'g', name: 'Gelado', location: 'congelador' }), prod({ id: 'c', name: 'Café' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  expect((screen.getByLabelText('Tipo de Gelado') as HTMLSelectElement).value).toBe('outros')
  expect(screen.queryByLabelText('Tipo de Café')).toBeNull()
  fireEvent.change(screen.getByLabelText('Tipo de Gelado'), { target: { value: 'carne' } })
  expect(repo.setFreezerCategory).toHaveBeenCalledWith(expect.objectContaining({ id: 'g' }), 'carne')
})

// --- by place, with − número + (spec §5.1, §5.2, §5.6)

const fridge = (p: Partial<Product>) => prod({ location: 'frigorifico', ...p })

test('each tab shows only the products of its place', () => {
  data.products = [fridge({ name: 'Iogurtes', count: 2 }), prod({ name: 'Arroz' }), prod({ name: 'Lixívia', location: 'limpeza' })]
  render(<MemoryRouter><Casa /></MemoryRouter>)
  expect(screen.getByRole('tab', { name: 'Frigorífico' }).getAttribute('aria-selected')).toBe('true')
  expect(screen.getByText('Iogurtes')).toBeTruthy()
  expect(screen.queryByText('Arroz')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'Despensa' }))
  expect(screen.getByText('Arroz')).toBeTruthy()
  expect(screen.queryByText('Iogurtes')).toBeNull()
  expect(screen.queryByText('Lixívia')).toBeNull()
})

test('the chosen tab is kept on the phone', () => {
  renderIt('Limpeza')
  expect(localStorage.getItem('casa.tab')).toBe('limpeza')
  cleanup()
  render(<MemoryRouter><Casa /></MemoryRouter>)
  expect(screen.getByRole('tab', { name: 'Limpeza' }).getAttribute('aria-selected')).toBe('true')
})

test('a broken saved tab falls back to Frigorífico', () => {
  localStorage.setItem('casa.tab', 'congelador')
  render(<MemoryRouter><Casa /></MemoryRouter>)
  expect(screen.getByRole('tab', { name: 'Frigorífico' }).getAttribute('aria-selected')).toBe('true')
})

test('"−" on Iogurtes 2 takes one, and Desfazer gives it back', () => {
  data.products = [fridge({ id: 'i', name: 'Iogurtes', count: 2 })]
  renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Menos Iogurtes' }))
  expect(stock.changeCount).toHaveBeenCalledWith(expect.objectContaining({ id: 'i' }), -1)
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(stock.changeCount).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'i' }), 1)
})

test('"−" on Iogurtes 1 says "Acabaram os Iogurtes" and "Pôr na lista" puts them on the list', () => {
  data.products = [fridge({ id: 'i', name: 'Iogurtes', count: 1 })]
  renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Menos Iogurtes' }))
  expect(screen.getByText('Acabaram os Iogurtes')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Pôr na lista' }))
  expect(repo.markMissing).toHaveBeenCalledWith(expect.objectContaining({ id: 'i' }), 'P', [])
})

test('when it is already on the list the toast only says "Acabaram os Iogurtes"', () => {
  data.products = [fridge({ id: 'i', name: 'Iogurtes', count: 1 })]
  data.shopping = [item({ productId: 'i' })]
  renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Menos Iogurtes' }))
  expect(screen.getByText('Acabaram os Iogurtes')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Pôr na lista' })).toBeNull()
})

test('"+" adds one; tapping the number asks "Quantos há?"', () => {
  data.products = [fridge({ id: 'i', name: 'Iogurtes', count: 2 })]
  renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Mais Iogurtes' }))
  expect(stock.changeCount).toHaveBeenCalledWith(expect.objectContaining({ id: 'i' }), 1)
  fireEvent.click(screen.getByRole('button', { name: 'Iogurtes: 2, mudar' }))
  fireEvent.change(screen.getByLabelText('Quantos há?'), { target: { value: '9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(stock.setCount).toHaveBeenCalledWith(expect.objectContaining({ id: 'i' }), 9)
  expect(stock.setLastQty).not.toHaveBeenCalled()
})

test('there is no "−" at 0, and a counted product never shows "Ainda há"', () => {
  data.products = [fridge({ id: 'l', name: 'Leite', count: 0, boughtKeys: ['2026-09-01', '2026-09-11', '2026-09-21'] })]
  renderIt('Frigorífico')
  expect(screen.queryByRole('button', { name: 'Menos Leite' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Ainda há Leite' })).toBeNull()
  expect(screen.getByText('acabou')).toBeTruthy()
})

test('on the list at 0 the note says "acabou · está na lista"', () => {
  data.products = [fridge({ id: 'l', name: 'Leite', count: 0 })]
  data.shopping = [item({ productId: 'l' })]
  renderIt('Frigorífico')
  expect(screen.getByText('acabou · está na lista')).toBeTruthy()
})

test('a product still to count shows "—", and entering 6 sets the count', () => {
  data.products = [fridge({ id: 'k', name: 'Kefir' })]
  renderIt('Frigorífico')
  expect(screen.getByText('—')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Kefir: por contar, mudar' }))
  fireEvent.change(screen.getByLabelText('Quantos há?'), { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(stock.setCount).toHaveBeenCalledWith(expect.objectContaining({ id: 'k' }), 6)
  expect(stock.changeCount).not.toHaveBeenCalled()
})

test('"+" on a product still to count also asks "Quantos há?"', () => {
  data.products = [fridge({ id: 'k', name: 'Kefir' })]
  renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Mais Kefir' }))
  expect(screen.getByLabelText('Quantos há?')).toBeTruthy()
  expect(stock.changeCount).not.toHaveBeenCalled()
})

test('a pending quantity says "falta pôr a quantidade"', () => {
  data.products = [fridge({ name: 'Kefir', count: 0, qtyPending: true })]
  renderIt('Frigorífico')
  expect(screen.getByText('falta pôr a quantidade')).toBeTruthy()
})

test('a count that may be stale asks "confirma: ainda há 5?" and dims the number', () => {
  data.products = [prod({ name: 'Arroz', count: 5, boughtKeys: ['2026-09-01', '2026-09-08'] })]
  renderIt()
  expect(screen.getByText(/confirma: ainda há 5\?/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Arroz: 5, mudar' }).className).toContain('dim')
})

test('"Comprei" at 0 without a usual quantity asks "Quantos compraste?"', () => {
  data.products = [fridge({ id: 'k', name: 'Kefir', count: 0 })]
  renderIt('Frigorífico')
  expect(screen.queryByRole('button', { name: 'Mais Kefir' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Comprei Kefir' }))
  fireEvent.change(screen.getByLabelText('Quantos compraste?'), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(repo.boughtOutside).toHaveBeenCalledWith(expect.objectContaining({ id: 'k' }), [], '2026-10-29', 'P')
  expect(stock.changeCount).toHaveBeenCalledWith(expect.objectContaining({ id: 'k' }), 4)
  expect(stock.setLastQty).toHaveBeenCalledWith(expect.objectContaining({ id: 'k' }), 4)
  expect(stock.setPurchaseQty).toHaveBeenCalledWith('pu1', 4)
})

test('cancelling "Quantos compraste?" records nothing', () => {
  data.products = [fridge({ id: 'k', name: 'Kefir', count: 0 })]
  renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Comprei Kefir' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(repo.boughtOutside).not.toHaveBeenCalled()
  expect(stock.changeCount).not.toHaveBeenCalled()
})

test('"Comprei" from the row menu adds the usual quantity; Desfazer takes it back', () => {
  data.products = [fridge({ id: 'i', name: 'Iogurtes', count: 2, lastQty: 6 })]
  renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Mais ações de Iogurtes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Comprei Iogurtes' }))
  expect(repo.boughtOutside).toHaveBeenCalled()
  expect(stock.changeCount).toHaveBeenCalledWith(expect.objectContaining({ id: 'i' }), 6)
  expect(stock.setPurchaseQty).toHaveBeenCalledWith('pu1', 6)
  expect(stock.setLastQty).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(repo.undoBought).toHaveBeenCalled()
  expect(stock.changeCount).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'i' }), -6)
})

test('a product not counted keeps today\'s actions and no number', () => {
  data.products = [fridge({ name: 'Manteiga', uncounted: true, boughtKeys: ['2026-10-25'] })]
  renderIt('Frigorífico')
  expect(screen.getByText(/sem contar · comprado há 4 dias/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Falta Manteiga' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Manteiga: .*mudar/ })).toBeNull()
})

test('Congelador products leave the lists; each tab ends with "Congelador: N sacos"', () => {
  data.products = [prod({ id: 'v', name: 'Vaca', location: 'congelador' }), fridge({ name: 'Iogurtes', count: 2 })]
  data.bags = [bag({ productId: 'v' }), bag({ productId: 'v' }), bag({ productId: 'v', where: 'frigorifico', movedKey: '2026-10-28' })]
  renderIt('Frigorífico')
  expect(screen.queryByText('Vaca')).toBeNull()
  const link = screen.getByRole('link', { name: /Congelador: 2 sacos/ })
  expect(link.getAttribute('href')).toBe('/congelador')
  fireEvent.click(screen.getByRole('tab', { name: 'Limpeza' }))
  expect(screen.getByRole('link', { name: /Congelador: 2 sacos/ })).toBeTruthy()
})

test('Editar: "Contar quantidades" turns counting off and on, not for Congelador', () => {
  data.products = [fridge({ id: 'i', name: 'Iogurtes', count: 2 }), prod({ id: 's', name: 'Sal', uncounted: true }), prod({ id: 'v', name: 'Vaca', location: 'congelador' })]
  renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  const iog = screen.getByRole('switch', { name: 'Contar quantidades de Iogurtes' }) as HTMLInputElement
  expect(iog.checked).toBe(true)
  fireEvent.click(iog)
  expect(stock.setUncounted).toHaveBeenCalledWith(expect.objectContaining({ id: 'i' }), true)
  const sal = screen.getByRole('switch', { name: 'Contar quantidades de Sal' }) as HTMLInputElement
  expect(sal.checked).toBe(false)
  fireEvent.click(sal)
  expect(stock.setUncounted).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's' }), false)
  expect(screen.queryByRole('switch', { name: 'Contar quantidades de Vaca' })).toBeNull()
})

test('"+ Produto" takes an optional "Quantos há?"', () => {
  renderIt('Frigorífico')
  fireEvent.change(screen.getByPlaceholderText('Nome (ex.: Leite)'), { target: { value: 'Kefir' } })
  fireEvent.change(screen.getByLabelText('Quantos há? (opcional)'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(repo.addProduct).toHaveBeenCalledWith('Kefir', 'frigorifico', [], 3)
})

test('"+ Produto" left empty stays to count; a bad number is not added', () => {
  renderIt('Despensa')
  fireEvent.change(screen.getByPlaceholderText('Nome (ex.: Leite)'), { target: { value: 'Arroz' } })
  fireEvent.change(screen.getByLabelText('Quantos há? (opcional)'), { target: { value: '1,5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(repo.addProduct).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Quantos há? (opcional)'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(repo.addProduct).toHaveBeenCalledWith('Arroz', 'despensa', [], undefined)
})

test('"Pôr na lista" checks the list as it is when tapped, not as it was at "−"', () => {
  data.products = [fridge({ id: 'i', name: 'Iogurtes', count: 1 })]
  const { rerender } = renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Menos Iogurtes' }))
  data.shopping = [item({ id: 'x', productId: 'i' })]
  rerender(<MemoryRouter><Casa /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Pôr na lista' }))
  expect(repo.markMissing).toHaveBeenCalledWith(expect.objectContaining({ id: 'i' }), 'P', [expect.objectContaining({ id: 'x' })])
})

test('at 0 with a pending quantity "+" stays, and Comprei moves to the row menu', () => {
  data.products = [fridge({ id: 'k', name: 'Kefir', count: 0, qtyPending: true })]
  renderIt('Frigorífico')
  fireEvent.click(screen.getByRole('button', { name: 'Mais Kefir' }))
  expect(stock.changeCount).toHaveBeenCalledWith(expect.objectContaining({ id: 'k' }), 1)
  expect(screen.queryByRole('button', { name: 'Comprei Kefir' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Mais ações de Kefir' }))
  expect(screen.getByRole('button', { name: 'Comprei Kefir' })).toBeTruthy()
})
