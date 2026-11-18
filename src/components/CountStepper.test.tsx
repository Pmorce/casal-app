import { fireEvent, render, screen } from '@testing-library/react'
import CountStepper from './CountStepper'

const handlers = () => ({ onMinus: vi.fn(), onPlus: vi.fn(), onNumber: vi.fn() })

test('− number +: each button does its own thing', () => {
  const h = handlers()
  render(<CountStepper value={2} label="Iogurtes" {...h} />)
  fireEvent.click(screen.getByRole('button', { name: 'Menos Iogurtes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mais Iogurtes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Iogurtes: 2, mudar' }))
  expect(h.onMinus).toHaveBeenCalledTimes(1)
  expect(h.onPlus).toHaveBeenCalledTimes(1)
  expect(h.onNumber).toHaveBeenCalledTimes(1)
})

test('there is no "−" at 0', () => {
  render(<CountStepper value={0} label="Leite" {...handlers()} />)
  expect(screen.queryByRole('button', { name: 'Menos Leite' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Leite: 0, mudar' })).toBeTruthy()
})

test('a product still to count shows "—" and no "−"', () => {
  const h = handlers()
  render(<CountStepper value={0} unknown label="Kefir" {...h} />)
  expect(screen.getByText('—')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Menos Kefir' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Kefir: por contar, mudar' }))
  expect(h.onNumber).toHaveBeenCalled()
})

test('a possibly stale number is dimmed', () => {
  render(<CountStepper value={5} dim label="Arroz" {...handlers()} />)
  expect(screen.getByRole('button', { name: 'Arroz: 5, mudar' }).className).toContain('dim')
})

test('something else can take the place of "+"', () => {
  render(<CountStepper value={0} label="Leite" {...handlers()} plus={<button>Comprei</button>} />)
  expect(screen.queryByRole('button', { name: 'Mais Leite' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Comprei' })).toBeTruthy()
})
