import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import PageHeader from './PageHeader'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'

function Editor({ dirty = false }: { dirty?: boolean }) {
  useUnsavedChanges(dirty)
  return <PageHeader title="Editar rotina" back={{ to: '/mais/rotinas', label: 'Voltar a Rotinas', history: true }} />
}

const renderAt = (entries: string[], dirty = false) => {
  const router = createMemoryRouter([
    { path: '/mais/rotinas/:id', element: <Editor dirty={dirty} /> },
    { path: '/mais/rotinas', element: <p>rotinas</p> },
    { path: '/mais', element: <p>mais</p> },
  ], { initialEntries: entries, initialIndex: entries.length - 1 })
  render(<RouterProvider router={router} />)
  return router
}

// the browser and hash histories keep the position in `window.history.state.idx`; the memory router does not, so tests set it
const setIdx = (idx?: number) => window.history.replaceState(idx === undefined ? null : { idx }, '')

beforeEach(() => setIdx())
afterEach(() => vi.restoreAllMocks())

test('in an editor, ‹ goes back in history: the editor is not left behind to come back to', async () => {
  setIdx(2)
  const router = renderAt(['/mais', '/mais/rotinas', '/mais/rotinas/r1?editar=1'])
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Voltar a Rotinas' })) })
  expect(screen.getByText('rotinas')).toBeTruthy()
  expect(router.state.historyAction).toBe('POP')
})

test('opened directly (nothing behind), ‹ still goes to its target', async () => {
  const router = renderAt(['/mais/rotinas/r1'])
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Voltar a Rotinas' })) })
  expect(screen.getByText('rotinas')).toBeTruthy()
  expect(router.state.historyAction).toBe('PUSH')
})

test('after a reload (the editor is the first in-app entry, though its key is not default), ‹ pushes its target instead of leaving', async () => {
  setIdx(0)
  const router = createMemoryRouter([
    { path: '/mais/rotinas/:id', element: <Editor /> },
    { path: '/mais/rotinas', element: <p>rotinas</p> },
  ], { initialEntries: [{ pathname: '/mais/rotinas/r1', key: 'abc123' }] })
  render(<RouterProvider router={router} />)
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Voltar a Rotinas' })) })
  expect(router.state.location.pathname).toBe('/mais/rotinas')
  expect(router.state.historyAction).toBe('PUSH')
})

test('with unsaved changes, ‹ asks first and staying keeps the editor', async () => {
  const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
  setIdx(1)
  renderAt(['/mais/rotinas', '/mais/rotinas/r1'], true)
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Voltar a Rotinas' })) })
  expect(ask).toHaveBeenCalledWith('Tens alterações por guardar. Sair mesmo assim?')
  expect(screen.queryByText('rotinas')).toBeNull()
})
