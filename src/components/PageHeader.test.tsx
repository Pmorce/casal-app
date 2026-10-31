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

afterEach(() => vi.restoreAllMocks())

test('in an editor, ‹ goes back in history: the editor is not left behind to come back to', async () => {
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

test('with unsaved changes, ‹ asks first and staying keeps the editor', async () => {
  const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
  renderAt(['/mais/rotinas', '/mais/rotinas/r1'], true)
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Voltar a Rotinas' })) })
  expect(ask).toHaveBeenCalledWith('Tens alterações por guardar. Sair mesmo assim?')
  expect(screen.queryByText('rotinas')).toBeNull()
})
