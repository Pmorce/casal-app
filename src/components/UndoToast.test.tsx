import { act, fireEvent, render, screen } from '@testing-library/react'
import UndoToast from './UndoToast'

test('a plain undo toast closes by itself after 5 s', () => {
  vi.useFakeTimers()
  const onClose = vi.fn()
  render(<UndoToast message="Apagado" onUndo={() => {}} onClose={onClose} />)
  act(() => { vi.advanceTimersByTime(5000) })
  expect(onClose).toHaveBeenCalled()
  vi.useRealTimers()
})

test('a toast offering an action stays until answered, and can be dismissed', () => {
  vi.useFakeTimers()
  const onClose = vi.fn()
  render(<UndoToast message="«Café» comprado" onUndo={() => {}} onClose={onClose} action={{ label: 'Registar gasto', run: () => {} }} />)
  act(() => { vi.advanceTimersByTime(60000) })
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
  expect(onClose).toHaveBeenCalled()
  vi.useRealTimers()
})
