import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hoje from './Hoje'
import { bag, prod } from '../domain/testFactories'
import type { FreezerBag, Product } from '../domain/types'

const data = vi.hoisted(() => ({ products: [] as Product[], bags: [] as FreezerBag[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) => (path === 'products' ? data.products : path === 'freezerBags' ? data.bags : []),
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
vi.mock('../components/RoutineToday', () => ({ default: () => null }))
vi.mock('../components/ChoresToday', () => ({ default: () => null }))

test('a Congelador product with bags is not counted as "talvez falte"', () => {
  data.products = [prod({ id: 'v', name: 'Vaca', location: 'congelador', boughtKeys: ['2026-10-20'], freezerLast: { amount: 5, unit: 'kg', key: '2026-10-20' } })]
  data.bags = [bag({ productId: 'v' })]
  render(<MemoryRouter><Hoje /></MemoryRouter>)
  expect(screen.getByText(/0 na lista/).textContent).not.toMatch(/talvez/)
})
