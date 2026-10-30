import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import TabBar from '../components/TabBar'
import { useUnsavedChanges } from './useUnsavedChanges'

const QUESTION = 'Tens alterações por guardar. Sair mesmo assim?'

function Editor({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty)
  return <p>editor</p>
}

const renderAt = (dirty: boolean, entries = ['/mais/rotinas/r1']) => {
  const router = createMemoryRouter([{
    element: <><Outlet /><TabBar /></>,
    children: [
      { path: '/mais/rotinas/r1', element: <Editor dirty={dirty} /> },
      { path: '/compras', element: <p>compras</p> },
    ],
  }], { initialEntries: entries, initialIndex: entries.length - 1 })
  render(<RouterProvider router={router} />)
  return router
}

afterEach(() => vi.restoreAllMocks())

test('Back with unsaved changes asks first, and staying keeps the edits', async () => {
  const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const router = renderAt(true, ['/compras', '/mais/rotinas/r1'])
  await act(() => router.navigate(-1))
  expect(ask).toHaveBeenCalledWith(QUESTION)
  expect(screen.getByText('editor')).toBeTruthy()
})

test('answering yes to Back leaves the editor', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const router = renderAt(true, ['/compras', '/mais/rotinas/r1'])
  await act(() => router.navigate(-1))
  expect(screen.getByText('compras')).toBeTruthy()
})

test('a tab link with unsaved changes asks once, and staying keeps the edits', () => {
  const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
  renderAt(true)
  fireEvent.click(screen.getByText('Compras'))
  expect(ask).toHaveBeenCalledTimes(1)
  expect(screen.getByText('editor')).toBeTruthy()
})

test('without changes Back and tabs just navigate', async () => {
  const ask = vi.spyOn(window, 'confirm')
  const router = renderAt(false, ['/compras', '/mais/rotinas/r1'])
  await act(() => router.navigate(-1))
  expect(screen.getByText('compras')).toBeTruthy()
  fireEvent.click(screen.getByText('Compras'))
  expect(ask).not.toHaveBeenCalled()
})

test('save and cancel navigations (replace) are not blocked', async () => {
  const ask = vi.spyOn(window, 'confirm')
  const router = renderAt(true)
  await act(() => router.navigate('/compras', { replace: true }))
  expect(ask).not.toHaveBeenCalled()
  expect(screen.getByText('compras')).toBeTruthy()
})
