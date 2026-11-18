import { fireEvent, render, screen } from '@testing-library/react'
import FreezeForm from './FreezeForm'
import { prod } from '../domain/testFactories'

const batch = { bagIds: ['n1'], previous: [] }
const repo = vi.hoisted(() => ({ freezeBought: vi.fn((_rows: unknown, _today: string): unknown => null) }))
vi.mock('../data/freezerRepo', () => repo)

const vaca = prod({ id: 'v', name: 'Vaca', location: 'congelador', freezerLast: { amount: 2.5, unit: 'kg' } })
const gelado = prod({ id: 'g', name: 'Gelado', location: 'congelador' })
const renderIt = (onSaved = vi.fn(), onDone = vi.fn()) => {
  render(<FreezeForm rows={[{ key: 'v', product: vaca }, { key: 'g', product: gelado }]} today="2026-10-30" onSaved={onSaved} onDone={onDone} />)
  return { onSaved, onDone }
}
beforeEach(() => { vi.clearAllMocks(); repo.freezeBought.mockReturnValue(batch) })

test('pre-fills from the last entry and saves one bag per product', () => {
  const { onSaved, onDone } = renderIt()
  expect((screen.getByLabelText('Quantidade de Vaca') as HTMLInputElement).value).toBe('2,5')
  expect(screen.getByRole('button', { name: 'Gelado: un.' }).className).toContain('on')
  fireEvent.change(screen.getByLabelText('Quantidade de Gelado'), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(repo.freezeBought).toHaveBeenCalledWith([
    { product: vaca, amount: 2.5, unit: 'kg', was: {} }, { product: gelado, amount: 4, unit: 'un', was: {} },
  ], '2026-10-30')
  expect(onSaved).toHaveBeenCalledWith(batch)
  expect(onDone).toHaveBeenCalled()
})

test('the unit can be changed per product', () => {
  renderIt()
  fireEvent.change(screen.getByLabelText('Quantidade de Gelado'), { target: { value: '500' } })
  fireEvent.click(screen.getByRole('button', { name: 'Gelado: g' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(repo.freezeBought).toHaveBeenCalledWith(expect.arrayContaining([{ product: gelado, amount: 500, unit: 'g', was: {} }]), '2026-10-30')
})

test('an invalid row stays marked and does not block the others', () => {
  const { onSaved, onDone } = renderIt()
  fireEvent.change(screen.getByLabelText('Quantidade de Vaca'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Quantidade de Gelado'), { target: { value: 'abc' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(repo.freezeBought).toHaveBeenCalledWith([{ product: vaca, amount: 2, unit: 'kg', was: {} }], '2026-10-30')
  expect(onSaved).toHaveBeenCalledWith(batch)
  expect(onDone).not.toHaveBeenCalled()
  expect(screen.queryByLabelText('Quantidade de Vaca')).toBeNull()
  expect(screen.getByLabelText('Quantidade de Gelado')).toBeTruthy()
  expect(screen.getByText('Quantidade inválida')).toBeTruthy()
})

test('with every row invalid nothing is written', () => {
  const { onSaved } = renderIt()
  fireEvent.change(screen.getByLabelText('Quantidade de Vaca'), { target: { value: '0' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(repo.freezeBought).not.toHaveBeenCalled()
  expect(onSaved).not.toHaveBeenCalled()
  expect(screen.getAllByText('Quantidade inválida')).toHaveLength(2)
})

test('"Agora não" closes without creating bags', () => {
  const { onDone } = renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
  expect(onDone).toHaveBeenCalled()
  expect(repo.freezeBought).not.toHaveBeenCalled()
})

test('the scroll effect does not crash when scrollIntoView returns a Promise', () => {
  const original = HTMLElement.prototype.scrollIntoView
  HTMLElement.prototype.scrollIntoView = (() => Promise.resolve()) as never
  try {
    const { unmount } = render(<FreezeForm rows={[{ key: 'g', product: gelado }]} today="2026-10-30" onSaved={() => {}} onDone={() => {}} />)
    expect(() => unmount()).not.toThrow()
  } finally {
    HTMLElement.prototype.scrollIntoView = original
  }
})

test('two parts of the same product are two rows, pre-filled with their amounts, each with its purchase', () => {
  const onSaved = vi.fn()
  render(<FreezeForm today="2026-10-30" onSaved={onSaved} onDone={() => {}} rows={[
    { key: 'a', product: vaca, amount: 3, unit: 'kg', purchaseId: 'pu1' },
    { key: 'b', product: vaca, amount: 1, unit: 'kg', purchaseId: 'pu2' },
  ]} />)
  const fields = screen.getAllByLabelText('Quantidade de Vaca') as HTMLInputElement[]
  expect(fields.map(f => f.value)).toEqual(['3', '1'])
  fireEvent.change(fields[1], { target: { value: '1,5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(repo.freezeBought).toHaveBeenCalledWith([
    { product: vaca, amount: 3, unit: 'kg', purchaseId: 'pu1', was: { amount: 3, unit: 'kg' } },
    { product: vaca, amount: 1.5, unit: 'kg', purchaseId: 'pu2', was: { amount: 1, unit: 'kg' } },
  ], '2026-10-30')
})

test('an amount like 2.5 shows as 2,5', () => {
  render(<FreezeForm today="2026-10-30" onSaved={() => {}} onDone={() => {}} rows={[{ key: 'a', product: vaca, amount: 2.5, unit: 'kg' }]} />)
  expect((screen.getByLabelText('Quantidade de Vaca') as HTMLInputElement).value).toBe('2,5')
})
