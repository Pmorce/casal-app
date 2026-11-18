import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ContarCasa from './ContarCasa'
import { prod } from '../domain/testFactories'
import type { Product } from '../domain/types'

const data = vi.hoisted(() => ({ products: [] as Product[] }))
vi.mock('../data/useCollection', () => ({ useCollection: () => data.products }))
const stock = vi.hoisted(() => ({ setCount: vi.fn(), setUncounted: vi.fn() }))
vi.mock('../data/stockRepo', () => stock)

beforeEach(() => {
  vi.clearAllMocks()
  data.products = [
    prod({ id: 'a', name: 'Leite', location: 'frigorifico' }),
    prod({ id: 'b', name: 'Arroz', location: 'despensa' }),
    prod({ id: 'c', name: 'Sal', location: 'despensa', count: 2 }),
  ]
})
const renderIt = () => render(<MemoryRouter><ContarCasa /></MemoryRouter>)

test('Ana types 6 and Seguinte counts it and moves to 2 de 2', () => {
  renderIt()
  expect(screen.getByText('Contar a casa · 1 de 2')).toBeTruthy()
  expect(screen.getByText('Leite')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Quantos há?'), { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: 'Seguinte' }))
  expect(stock.setCount).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 6)
  expect(screen.getByText('Contar a casa · 2 de 2')).toBeTruthy()
})

test('Rui skips with Saltar and nothing is written', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))
  expect(stock.setCount).not.toHaveBeenCalled()
  expect(stock.setUncounted).not.toHaveBeenCalled()
  expect(screen.getByText('Contar a casa · 2 de 2')).toBeTruthy()
})

test('Não contar este marks the product and ends with Casa contada', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Não contar este' }))
  expect(stock.setUncounted).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), true)
  fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))
  expect(screen.getByText('Casa contada')).toBeTruthy()
  expect(screen.getByRole('link', { name: /Hoje/ }).getAttribute('href')).toBe('/')
})

test('a bad number is refused and writes nothing', () => {
  renderIt()
  fireEvent.change(screen.getByLabelText('Quantos há?'), { target: { value: '-1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Seguinte' }))
  expect(stock.setCount).not.toHaveBeenCalled()
  expect(screen.getByText('Contar a casa · 1 de 2')).toBeTruthy()
})
