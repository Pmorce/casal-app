import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import TabBar from '../components/TabBar'
import { useUnsavedChanges } from './useUnsavedChanges'

const QUESTION = 'Tens alterações por guardar. Sair mesmo assim?'

function Editor({ dirty }: { dirty: boolean }) {
  const leave = useUnsavedChanges(dirty)
  return <><p>editor</p><button onClick={() => leave('/compras')}>sair</button></>
}

const renderAt = (dirty: boolean, entries = ['/mais/rotinas/r1']) => {
  const router = createMemoryRouter([{
    element: <><Outlet /><TabBar /></>,
    children: [
      { path: '/mais/rotinas/r1', element: <Editor dirty={dirty} /> },
      { path: '/compras', element: <p>compras</p> },
      { path: '/mais/rotinas', element: <p>rotinas</p> },
      { path: '/', element: <p>home</p> },
    ],
  }], { initialEntries: entries, initialIndex: entries.length - 1 })
  render(<StrictMode><RouterProvider router={router} /></StrictMode>)
  return router
}

// the memory router has no window.history.state.idx, which is what tells there is an in-app entry behind
const setIdx = (idx?: number) => window.history.replaceState(idx === undefined ? null : { idx }, '')

afterEach(() => { vi.restoreAllMocks(); setIdx() })

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

test('leave goes back to where you came from, without asking, even with unsaved changes', async () => {
  const ask = vi.spyOn(window, 'confirm')
  setIdx(1)
  const router = renderAt(true, ['/compras', '/mais/rotinas/r1'])
  fireEvent.click(screen.getByText('sair'))
  await act(() => Promise.resolve())
  expect(ask).not.toHaveBeenCalled()
  expect(screen.getByText('compras')).toBeTruthy()
  expect(router.state.historyAction).toBe('POP')
})

test('leave with nothing behind replaces with the fallback', async () => {
  const router = renderAt(true)
  fireEvent.click(screen.getByText('sair'))
  await act(() => Promise.resolve())
  expect(screen.getByText('compras')).toBeTruthy()
  expect(router.state.historyAction).toBe('REPLACE')
})

test('leave after a reload (editor is entry 0, key not default) replaces with the fallback instead of leaving the app', async () => {
  setIdx(0)
  const router = renderAt(true, [{ pathname: '/mais/rotinas/r1', key: 'abc123' }] as unknown as string[])
  fireEvent.click(screen.getByText('sair'))
  await act(() => Promise.resolve())
  expect(screen.getByText('compras')).toBeTruthy()
  expect(router.state.historyAction).toBe('REPLACE')
})

test('after leave, Back from the list does not land on the list again', async () => {
  setIdx(2)
  const router = renderAt(true, ['/', '/mais/rotinas', '/mais/rotinas/r1'])
  fireEvent.click(screen.getByText('sair'))
  await act(() => Promise.resolve())
  expect(screen.getByText('rotinas')).toBeTruthy()
  await act(() => router.navigate(-1))
  expect(screen.getByText('home')).toBeTruthy()
})
