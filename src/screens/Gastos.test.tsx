import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Gastos from './Gastos'

const clock = vi.hoisted(() => ({ today: '2026-10-31' }))
vi.mock('../hooks/useToday', () => ({ useToday: () => clock.today }))
vi.mock('../data/useCollection', () => ({ useCollection: () => [] }))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
const repo = vi.hoisted(() => ({ addExpense: vi.fn(), deleteExpense: vi.fn() }))
vi.mock('../data/expensesRepo', () => repo)
vi.mock('../data/restore', () => ({ restore: vi.fn() }))

const ui = () => <MemoryRouter><Gastos /></MemoryRouter>
const dateInput = () => document.querySelector('input[type="date"]') as HTMLInputElement
beforeEach(() => { vi.clearAllMocks(); clock.today = '2026-10-31' })

test('left open past midnight, the date and the month follow today', () => {
  const { rerender } = render(ui())
  clock.today = '2026-11-01'
  rerender(ui())
  expect(dateInput().value).toBe('2026-11-01')
  expect(screen.getByText('Novembro 2026')).toBeTruthy()
})

test('a date picked by hand stays, and goes back to today after registering', () => {
  const { rerender } = render(ui())
  fireEvent.change(dateInput(), { target: { value: '2026-10-15' } })
  clock.today = '2026-11-01'
  rerender(ui())
  expect(dateInput().value).toBe('2026-10-15')
  fireEvent.change(screen.getByPlaceholderText(/Valor/), { target: { value: '12' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registar' }))
  expect(repo.addExpense).toHaveBeenCalledWith(1200, 'P', '2026-10-15', '')
  expect(dateInput().value).toBe('2026-11-01')
})

test('a month picked by hand stays at midnight', () => {
  const { rerender } = render(ui())
  fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
  clock.today = '2026-11-01'
  rerender(ui())
  expect(screen.getByText('Setembro 2026')).toBeTruthy()
})

test('",5" is accepted as 0,50 €', () => {
  render(ui())
  fireEvent.change(screen.getByPlaceholderText(/Valor/), { target: { value: ',5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registar' }))
  expect(repo.addExpense).toHaveBeenCalledWith(50, 'P', '2026-10-31', '')
})
