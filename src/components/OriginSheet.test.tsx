import { fireEvent, render, screen } from '@testing-library/react'
import OriginSheet from './OriginSheet'

const props = {
  name: 'Vaca', unit: 'kg' as const, initialAmount: 1.5, defaultOrigin: 'comprei' as const,
  stores: ['Lidl', 'Continente'], onAddCustom: vi.fn(), onSave: vi.fn(), onCancel: vi.fn(),
}
beforeEach(() => vi.clearAllMocks())

test('Comprei by default, the amount pre-filled; the store is optional', () => {
  render(<OriginSheet {...props} />)
  expect(screen.getByText('De onde veio?')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Comprei' }).getAttribute('aria-pressed')).toBe('true')
  expect((screen.getByLabelText('Quantidade (kg)') as HTMLInputElement).value).toBe('1,5')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(props.onSave).toHaveBeenCalledWith('comprei', 1.5, undefined)
})

test('a store tapped twice is unpicked', () => {
  render(<OriginSheet {...props} />)
  const lidl = screen.getByRole('button', { name: 'Lidl' })
  fireEvent.click(lidl)
  expect(lidl.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(lidl)
  expect(lidl.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(props.onSave).toHaveBeenCalledWith('comprei', 1.5, undefined)
})

test('"+ outra" adds a store of your own and picks it', () => {
  render(<OriginSheet {...props} />)
  fireEvent.click(screen.getByRole('button', { name: '+ outra' }))
  fireEvent.change(screen.getByLabelText('Nome da loja'), { target: { value: ' Talho do Rui ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(props.onAddCustom).toHaveBeenCalledWith('Talho do Rui')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(props.onSave).toHaveBeenCalledWith('comprei', 1.5, 'Talho do Rui')
})

test('Ofereceram and Cozinhei show no store and never send one', () => {
  render(<OriginSheet {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Lidl' }))
  fireEvent.click(screen.getByRole('button', { name: 'Ofereceram' }))
  expect(screen.queryByRole('button', { name: 'Lidl' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(props.onSave).toHaveBeenCalledWith('ofereceram', 1.5, undefined)
})

test('an invalid amount is refused with a message', () => {
  render(<OriginSheet {...props} defaultOrigin="cozinhei" />)
  expect(screen.getByRole('button', { name: 'Cozinhei' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.change(screen.getByLabelText('Quantidade (kg)'), { target: { value: '0' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(screen.getByText('Quantidade inválida')).toBeTruthy()
  expect(props.onSave).not.toHaveBeenCalled()
})

test('Cancelar only closes', () => {
  render(<OriginSheet {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(props.onCancel).toHaveBeenCalled()
  expect(props.onSave).not.toHaveBeenCalled()
})
