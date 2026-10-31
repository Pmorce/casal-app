import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import RotinaEditar from './RotinaEditar'
import { routine, step } from '../domain/testFactories'
import type { Routine } from '../domain/types'

const data = vi.hoisted(() => ({ routines: [] as Routine[] }))
vi.mock('../data/useCollection', () => ({ useCollection: (path: string) => (path === 'routines' ? data.routines : []) }))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-31' }))
vi.mock('../data/routinesRepo', () => ({ deleteRoutine: vi.fn(), newId: vi.fn(() => 'n1'), saveRoutine: vi.fn() }))

const renderEditing = () => {
  const router = createMemoryRouter([{ path: '/mais/rotinas/:id', element: <RotinaEditar /> }],
    { initialEntries: ['/mais/rotinas/r1?editar=1'] })
  render(<RouterProvider router={router} />)
}

test('Subir and Descer are icon buttons that reorder the steps', () => {
  data.routines = [routine({ id: 'r1', ownerUid: 'P', steps: [step({ text: 'Lavar' }), step({ text: 'Secar' })] })]
  renderEditing()
  const up = screen.getAllByRole('button', { name: 'Subir' })
  expect(up[1].querySelector('svg')).not.toBeNull()
  expect(up[1].textContent).toBe('')
  expect(screen.getAllByRole('button', { name: 'Descer' })[0].querySelector('svg')).not.toBeNull()
  fireEvent.click(up[1])
  expect(screen.getAllByPlaceholderText('Passo').map(i => (i as HTMLInputElement).value)).toEqual(['Secar', 'Lavar'])
})

const backFrom = async (entries: Array<string | { pathname: string; search?: string; state?: unknown }>) => {
  const router = createMemoryRouter([
    { path: '/mais/rotinas/:id', element: <RotinaEditar /> },
    { path: '/mais/rotinas', element: <p>rotinas</p> },
  ], { initialEntries: entries, initialIndex: entries.length - 1 })
  render(<RouterProvider router={router} />)
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Voltar a Rotinas' })) })
  return router
}

test('editing an existing routine, ‹ goes to Rotinas (push), not back over the routine own screen', async () => {
  data.routines = [routine({ id: 'r1', ownerUid: 'P', steps: [step({ text: 'Lavar' })] })]
  const router = await backFrom(['/mais/rotinas/r1', '/mais/rotinas/r1?editar=1'])
  expect(screen.getByText('rotinas')).toBeTruthy()
  expect(router.state.historyAction).toBe('PUSH')
})

test('editing a NEW routine, ‹ goes back in history (no replayable editor entry left)', async () => {
  data.routines = []
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  window.history.replaceState({ idx: 1 }, '') // an in-app entry behind, as React Router's browser histories record it
  const router = await backFrom(['/mais/rotinas', { pathname: '/mais/rotinas/n1', search: '?editar=1', state: { novo: routine({ id: 'n1', ownerUid: 'P' }) } }])
  expect(screen.getByText('rotinas')).toBeTruthy()
  expect(router.state.historyAction).toBe('POP')
})

afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, '') })
