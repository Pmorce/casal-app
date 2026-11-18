import { fireEvent, render, screen } from '@testing-library/react'
import EatFirst from './EatFirst'
import { bag } from '../domain/testFactories'

const repo = vi.hoisted(() => ({
  cook: vi.fn(() => ({ bagIds: ['n1'] })), undoCook: vi.fn(), useDose: vi.fn((b: unknown) => b), deleteBag: vi.fn(),
  restoreBag: vi.fn(), backToFreezer: vi.fn(), moveToFridge: vi.fn(), updateBag: vi.fn(),
}))
vi.mock('../data/freezerRepo', () => repo)

const onUndo = vi.fn()
const today = '2026-11-18'
const vaca = bag({ id: 'v', name: 'Vaca', amount: 1, unit: 'kg', where: 'frigorifico', movedKey: '2026-11-17' })
const arroz = bag({ id: 'a', name: 'Arroz de vaca', category: 'feita', unit: 'doses', amount: 2, where: 'frigorifico', movedKey: '2026-11-15', addedKey: '2026-11-15', madeFrom: 'Vaca 1 kg' })
const show = (bags = [vaca, arroz]) => render(<EatFirst bags={bags} today={today} names={['Sopa']} onUndo={onUndo} />)
beforeEach(() => vi.clearAllMocks())

test('shows nothing when there are no bags', () => {
  const { container } = show([])
  expect(container.textContent).toBe('')
})

test('a thawing bag says since when; a feita bag says how long, with the 3-day badge', () => {
  show()
  expect(screen.getByText('Para comer primeiro')).toBeTruthy()
  expect(screen.getByText(/a descongelar desde ontem/)).toBeTruthy()
  expect(screen.getByText(/no frigorífico há 3 dias/)).toBeTruthy()
  expect(screen.getByText(/feito a 15\/11 com Vaca 1 kg/)).toBeTruthy()
  expect(screen.getByText('3 dias')).toBeTruthy()
  expect(screen.getByText('come primeiro')).toBeTruthy()
})

test('under 3 days there is no badge', () => {
  show([{ ...arroz, movedKey: '2026-11-17' }])
  expect(screen.queryByText('come primeiro')).toBeNull()
})

test('"−" on 2 doses takes one dose, with one undo that puts the bag back', () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Menos Arroz de vaca' }))
  expect(repo.useDose).toHaveBeenCalledWith(arroz)
  expect(onUndo).toHaveBeenCalledTimes(1)
  onUndo.mock.calls[0][1]()
  expect(repo.restoreBag).toHaveBeenCalledWith(arroz)
})

test('Cozinhei opens the form with the origin; Guardar cooks from that bag, with one undo', () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Cozinhei Vaca' }))
  expect(screen.getByText('Cozinhei com Vaca 1 kg')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('O que fizeste'), { target: { value: 'Estufado' } })
  fireEvent.change(screen.getByLabelText('Para o frigorífico'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(repo.cook).toHaveBeenCalledWith({ name: 'Estufado', freezerDoses: 0, fridgeDoses: 3, madeFrom: 'Vaca 1 kg' }, today, vaca)
  expect(onUndo).toHaveBeenCalledTimes(1)
  onUndo.mock.calls[0][1]()
  expect(repo.undoCook).toHaveBeenCalledWith({ bagIds: ['n1'] })
})

test('Não guardámos nada takes the bag out, with undo', () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Cozinhei Vaca' }))
  fireEvent.click(screen.getByRole('button', { name: 'Não guardámos nada' }))
  expect(repo.deleteBag).toHaveBeenCalledWith('v')
  onUndo.mock.calls[0][1]()
  expect(repo.restoreBag).toHaveBeenCalledWith(vaca)
})

test('the thawing menu: Acabou / deitar fora and Voltar ao congelador', () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Mais opções de Vaca' }))
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao congelador' }))
  expect(repo.backToFreezer).toHaveBeenCalledWith(vaca)
  onUndo.mock.calls[0][1]()
  expect(repo.moveToFridge).toHaveBeenCalledWith(vaca, '2026-11-17')
  fireEvent.click(screen.getByRole('button', { name: 'Mais opções de Vaca' }))
  fireEvent.click(screen.getByRole('button', { name: 'Acabou / deitar fora' }))
  expect(repo.deleteBag).toHaveBeenCalledWith('v')
})
