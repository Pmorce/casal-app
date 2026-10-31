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

test('the header counts the chores due today', () => {
  data.chores = [
    { id: 'a', title: 'Lixo', kind: 'diaria', createdKey: '2026-10-01' },
    { id: 'b', title: 'Loiça', kind: 'diaria', createdKey: '2026-10-01' },
  ]
  render(<ChoresToday />)
  expect(screen.getByText('2 para hoje')).toBeTruthy()
})

test('only a chore that someone did before shows an avatar', () => {
  data.chores = [
    { id: 'a', title: 'Lixo', kind: 'diaria', lastDoneBy: 'B', lastDoneKey: '2026-10-28', createdKey: '2026-10-01' },
    { id: 'b', title: 'Loiça', kind: 'diaria', createdKey: '2026-10-01' },
  ]
  render(<ChoresToday />)
  const rows = document.querySelectorAll('.row')
  expect(rows).toHaveLength(2)
  expect(rows[0].querySelectorAll('.avatar')).toHaveLength(1)
  expect(rows[1].querySelectorAll('.avatar')).toHaveLength(0)
})

test('an overdue weekly chore has the atrasada pill, a daily one does not', () => {
  // 2026-10-29 is a Thursday; the weekly chore was due on Monday
  data.chores = [
    { id: 'w', title: 'Aspirar', kind: 'semanal', weekday: 1, createdKey: '2026-10-01' },
    { id: 'd', title: 'Lixo', kind: 'diaria', createdKey: '2026-10-01' },
  ]
  render(<ChoresToday />)
  const pills = Array.from(document.querySelectorAll('.pill')).map(p => p.textContent)
  expect(pills).toEqual(['atrasada', 'diária'])
  expect(screen.getByText('atrasada').className).toBe('pill danger')
})
