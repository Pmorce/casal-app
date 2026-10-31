import { render, screen } from '@testing-library/react'
import ChoresToday from './ChoresToday'
import type { Chore } from '../domain/types'

const data = vi.hoisted(() => ({ chores: [] as Chore[] }))
vi.mock('../data/useCollection', () => ({ useCollection: (path: string) => (path === 'chores' ? data.chores : []) }))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
vi.mock('../data/choresRepo', () => ({ markChore: vi.fn(), undoChore: vi.fn() }))

test('the avatar announces who did the chore last', () => {
  data.chores = [{ id: 'c', title: 'Lixo', kind: 'diaria', lastDoneBy: 'B', lastDoneKey: '2026-10-28', createdKey: '2026-10-01' }]
  render(<ChoresToday />)
  expect(screen.getByRole('img', { name: 'feita por último por Rui' })).toBeTruthy()
})

test('an unknown member is announced as Desconhecido', () => {
  data.chores = [{ id: 'c', title: 'Lixo', kind: 'diaria', lastDoneBy: 'Z', lastDoneKey: '2026-10-28', createdKey: '2026-10-01' }]
  render(<ChoresToday />)
  expect(screen.getByRole('img', { name: 'feita por último por Desconhecido' })).toBeTruthy()
})
