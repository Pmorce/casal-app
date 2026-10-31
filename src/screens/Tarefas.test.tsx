import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Tarefas from './Tarefas'
import { chore } from '../domain/testFactories'
import type { Chore } from '../domain/types'

const data = vi.hoisted(() => ({ chores: [] as Chore[] }))
vi.mock('../data/useCollection', () => ({ useCollection: (path: string) => (path === 'chores' ? data.chores : []) }))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
vi.mock('../data/choresRepo', () => ({ addChore: vi.fn(), deleteChore: vi.fn(), markChore: vi.fn(), undoChore: vi.fn() }))
vi.mock('../data/restore', () => ({ restore: vi.fn() }))

test('the list says who did a chore, and an unknown member is Desconhecido', () => {
  data.chores = [
    chore({ id: 'a', title: 'Lixo', lastDoneBy: 'B', lastDoneKey: '2026-10-28' }),
    chore({ id: 'b', title: 'Aspirar', kind: 'pontual', lastDoneBy: 'Z', lastDoneKey: '2026-10-27' }),
  ]
  render(<MemoryRouter><Tarefas /></MemoryRouter>)
  expect(screen.getByText(/feita por Rui, ontem/)).toBeTruthy()
  expect(screen.getByText(/feita por Desconhecido, há 2 dias/)).toBeTruthy()
  expect(screen.queryByText(/feita por \?/)).toBeNull()
})
