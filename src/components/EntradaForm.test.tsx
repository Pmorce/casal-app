import { fireEvent, render, screen } from '@testing-library/react'
import EntradaForm from './EntradaForm'
import { prod } from '../domain/testFactories'

const stock = vi.hoisted(() => ({
  changeCount: vi.fn(), setLastQty: vi.fn(), setPurchaseQty: vi.fn(), markQtyPending: vi.fn(), clearQtyPending: vi.fn(),
}))
vi.mock('../data/stockRepo', () => stock)

const kefir = prod({ id: 'k', name: 'Kefir', location: 'frigorifico', count: 0 })
const agua = prod({ id: 'a', name: 'Garrafões água', location: 'despensa', count: 1, qtyPending: true })
const renderIt = (onSaved = vi.fn(), onDone = vi.fn()) => {
  render(<EntradaForm rows={[{ product: kefir, purchaseId: 'pu1' }, { product: agua }]} onSaved={onSaved} onDone={onDone} />)
  return { onSaved, onDone }
}
beforeEach(() => vi.clearAllMocks())

test('shows the title, the note and one field per product (Ana)', () => {
  renderIt()
  expect(screen.getByText('O que entrou')).toBeTruthy()
  expect(screen.getByText('Só para o que é novo. Para a próxima já sei.')).toBeTruthy()
  expect(screen.getByLabelText('Unidades de Kefir')).toBeTruthy()
  expect(screen.getByLabelText('Unidades de Garrafões água')).toBeTruthy()
  expect(screen.getAllByText('un.')).toHaveLength(2)
})

test('Guardar with 4 adds them, remembers 4 for next time and puts them on the purchase row (Rui)', () => {
  const { onSaved, onDone } = renderIt()
  fireEvent.change(screen.getByLabelText('Unidades de Kefir'), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText('Unidades de Garrafões água'), { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(stock.changeCount).toHaveBeenCalledWith(kefir, 4)
  expect(stock.setLastQty).toHaveBeenCalledWith(kefir, 4)
  expect(stock.setPurchaseQty).toHaveBeenCalledWith('pu1', 4)
  expect(stock.changeCount).toHaveBeenCalledWith(agua, 6)
  expect(stock.setPurchaseQty).toHaveBeenCalledTimes(1)
  // putting the number in settles an old "Agora não"; Kefir never had one
  expect(stock.clearQtyPending).toHaveBeenCalledWith(agua)
  expect(stock.clearQtyPending).toHaveBeenCalledTimes(1)
  expect(onSaved).toHaveBeenCalledWith({ saved: [{ product: kefir, n: 4 }, { product: agua, n: 6 }], pending: [] })
  expect(onDone).toHaveBeenCalled()
})

test('"Agora não" marks them pending (Ana)', () => {
  const { onSaved, onDone } = renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
  expect(stock.markQtyPending).toHaveBeenCalledWith([kefir, agua])
  expect(stock.changeCount).not.toHaveBeenCalled()
  expect(onSaved).toHaveBeenCalledWith({ saved: [], pending: [kefir, agua] })
  expect(onDone).toHaveBeenCalled()
})

test.each(['abc', '0', '1,5', ''])('"%s" is not a quantity: the row stays, marked (Rui)', value => {
  const { onDone } = renderIt()
  fireEvent.change(screen.getByLabelText('Unidades de Kefir'), { target: { value } })
  fireEvent.change(screen.getByLabelText('Unidades de Garrafões água'), { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(stock.changeCount).toHaveBeenCalledWith(agua, 6)
  expect(stock.changeCount).not.toHaveBeenCalledWith(kefir, expect.anything())
  expect(onDone).not.toHaveBeenCalled()
  expect(screen.getByText('Quantidade inválida')).toBeTruthy()
  expect(screen.queryByLabelText('Unidades de Garrafões água')).toBeNull()
  // "Agora não" now only marks what is left
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
  expect(stock.markQtyPending).toHaveBeenCalledWith([kefir])
})
