import { render } from '@testing-library/react'
import SpentForm from './SpentForm'

vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../data/expensesRepo', () => ({ addExpense: vi.fn() }))

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
