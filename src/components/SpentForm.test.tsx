import { fireEvent, render, screen } from '@testing-library/react'
import SpentForm from './SpentForm'

vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
const repo = vi.hoisted(() => ({ addExpense: vi.fn() }))
vi.mock('../data/expensesRepo', () => repo)

// Recent Chromium returns a Promise from scrollIntoView; an effect must not hand it back to React as its cleanup.
test('closing the form does not crash when scrollIntoView returns a value (black screen bug)', () => {
  const original = HTMLElement.prototype.scrollIntoView
  HTMLElement.prototype.scrollIntoView = (() => Promise.resolve()) as never
  try {
    const { unmount } = render(<SpentForm title="Quanto foi?" today="2026-10-30" onDone={() => {}} />)
    expect(() => unmount()).not.toThrow()
  } finally {
    HTMLElement.prototype.scrollIntoView = original
  }
})

test('the store of the card goes with the expense', () => {
  render(<SpentForm title="Lidl — quanto foi?" store="Lidl" today="2026-10-30" onDone={() => {}} />)
  fireEvent.change(screen.getByPlaceholderText(/47,30/), { target: { value: '9,99' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registar' }))
  expect(repo.addExpense).toHaveBeenCalledWith(999, 'P', '2026-10-30', undefined, 'Lidl')
})
