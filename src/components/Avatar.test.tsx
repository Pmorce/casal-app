import { render, screen } from '@testing-library/react'
import Avatar from './Avatar'

vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Paulo', members: { P: 'Paulo' } }) }))

test('a label replaces the member name as the accessible name', () => {
  render(<Avatar uid="P" label="feita por último por Paulo" />)
  expect(screen.getByRole('img', { name: 'feita por último por Paulo' })).toBeTruthy()
})

test('without a label the name is the member name', () => {
  render(<Avatar uid="P" />)
  expect(screen.getByRole('img', { name: 'Paulo' })).toBeTruthy()
})
