import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import Checklist from './Checklist'
import type { Checklist as ChecklistT } from '../domain/types'

const data = vi.hoisted(() => ({ checklists: [] as ChecklistT[] }))
vi.mock('../data/useCollection', () => ({ useCollection: (path: string) => (path === 'checklists' ? data.checklists : []) }))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../data/routinesRepo', () => ({
  clearChecklist: vi.fn(), deleteChecklist: vi.fn(), newId: vi.fn(() => 'n1'), saveChecklist: vi.fn(), toggleChecklistItem: vi.fn(),
}))

const list = (id: string): ChecklistT => ({ id, ownerUid: 'P', name: 'Mala', items: [], checkedIds: [] })

const backFrom = async (entries: Array<string | { pathname: string; search?: string; state?: unknown }>) => {
  const router = createMemoryRouter([
    { path: '/mais/checklists/:id', element: <Checklist /> },
    { path: '/mais/rotinas', element: <p>rotinas</p> },
  ], { initialEntries: entries, initialIndex: entries.length - 1 })
  render(<RouterProvider router={router} />)
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Voltar a Rotinas' })) })
  return router
}
const newEntry = { pathname: '/mais/checklists/n1', search: '?editar=1', state: { novo: list('n1') } }

test('editing an existing checklist, ‹ goes to Rotinas (push)', async () => {
  data.checklists = [list('c1')]
  window.history.replaceState({ idx: 1 }, '') // an entry behind: history mode would pop back onto the checklist itself
  const router = await backFrom(['/mais/checklists/c1', '/mais/checklists/c1?editar=1'])
  expect(screen.getByText('rotinas')).toBeTruthy()
  expect(router.state.historyAction).toBe('PUSH')
})

test('editing a NEW checklist, ‹ goes back in history', async () => {
  data.checklists = []
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  window.history.replaceState({ idx: 1 }, '')
  const router = await backFrom(['/mais/rotinas', newEntry])
  expect(screen.getByText('rotinas')).toBeTruthy()
  expect(router.state.historyAction).toBe('POP')
})

test('editing a NEW checklist after a reload (no entry behind), ‹ pushes Rotinas instead of leaving the app', async () => {
  data.checklists = []
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  window.history.replaceState({ idx: 0 }, '')
  const router = await backFrom(['/mais/rotinas', newEntry])
  expect(screen.getByText('rotinas')).toBeTruthy()
  expect(router.state.historyAction).toBe('PUSH')
})

afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, '') })
