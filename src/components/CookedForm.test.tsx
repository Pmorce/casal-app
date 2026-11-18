import { fireEvent, render, screen } from '@testing-library/react'
import CookedForm from './CookedForm'

const props = { origin: 'Vaca 1 kg', names: ['Sopa da Ana'], onSave: vi.fn(), onNothing: vi.fn(), onCancel: vi.fn() }
beforeEach(() => vi.clearAllMocks())
const type = (label: string, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } })

test('the title carries the origin, or is just Cozinhei', () => {
  const { unmount } = render(<CookedForm {...props} />)
  expect(screen.getByText('Cozinhei com Vaca 1 kg')).toBeTruthy()
  expect(screen.getByText('Guardaste alguma coisa?')).toBeTruthy()
  unmount()
  render(<CookedForm {...props} origin={undefined} />)
  expect(screen.getByText('Cozinhei')).toBeTruthy()
})

test('Guardar needs a name and at least one dose above 0', () => {
  render(<CookedForm {...props} />)
  const save = screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement
  expect(save.disabled).toBe(true)
  type('Para o congelador', '4')
  expect(save.disabled).toBe(true) // no name
  type('O que fizeste', 'Arroz de vaca')
  expect(save.disabled).toBe(false)
  type('Para o congelador', '0')
  expect(save.disabled).toBe(true) // both 0
  type('Para o frigorífico', '2')
  expect(save.disabled).toBe(false)
})

test('Guardar sends the name and both doses; a decimal is not a dose', () => {
  render(<CookedForm {...props} />)
  type('O que fizeste', ' Arroz de vaca ')
  type('Para o congelador', '4')
  type('Para o frigorífico', '1,5')
  expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true)
  type('Para o frigorífico', '2')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(props.onSave).toHaveBeenCalledWith({ name: 'Arroz de vaca', freezerDoses: 4, fridgeDoses: 2 })
})

test('Não guardámos nada calls onNothing', () => {
  render(<CookedForm {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Não guardámos nada' }))
  expect(props.onNothing).toHaveBeenCalled()
})

test('Escape and Cancelar call onCancel and never onNothing', () => {
  render(<CookedForm {...props} />)
  fireEvent.keyDown(screen.getByLabelText('O que fizeste'), { key: 'Escape' })
  expect(props.onCancel).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(props.onCancel).toHaveBeenCalledTimes(2)
  expect(props.onNothing).not.toHaveBeenCalled()
})
