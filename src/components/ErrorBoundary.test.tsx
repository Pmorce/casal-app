import { fireEvent, render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function Boom(): never {
  throw new Error('boom: x is undefined')
}

// the throw is expected: keep React's and jsdom's reports of it out of the test output
const quiet = (e: ErrorEvent) => e.preventDefault()
beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); window.addEventListener('error', quiet) })
afterEach(() => { vi.restoreAllMocks(); window.removeEventListener('error', quiet) })

test('an error shows "Algo correu mal" with the message and a reload button', () => {
  const reload = vi.fn()
  vi.stubGlobal('location', { ...window.location, reload })
  render(<ErrorBoundary resetKey="/a"><Boom /></ErrorBoundary>)
  expect(screen.getByText('Algo correu mal')).toBeTruthy()
  expect(screen.getByText('boom: x is undefined')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
  expect(reload).toHaveBeenCalled()
  vi.unstubAllGlobals()
})

test('a new resetKey (another tab) clears the error', () => {
  const { rerender } = render(<ErrorBoundary resetKey="/a"><Boom /></ErrorBoundary>)
  rerender(<ErrorBoundary resetKey="/b"><p>Compras</p></ErrorBoundary>)
  expect(screen.getByText('Compras')).toBeTruthy()
  expect(screen.queryByText('Algo correu mal')).toBeNull()
})
