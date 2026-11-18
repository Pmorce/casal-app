import type { Chore, Expense, FreezerBag, Part, Product, Purchase, Routine, ShoppingItem, Step } from './types'

let n = 0
const nid = () => `id${++n}`

export const item = (p: Partial<ShoppingItem> = {}): ShoppingItem =>
  ({ id: nid(), text: 'Item', addedBy: 'P', status: 'porComprar', ...p })
export const prod = (p: Partial<Product> = {}): Product =>
  ({ id: nid(), name: 'Produto', location: 'despensa', ...p })
export const bag = (p: Partial<FreezerBag> = {}): FreezerBag =>
  ({ id: nid(), name: 'Bifes', category: 'carne', amount: 1, unit: 'un', addedKey: '2026-10-01', ...p })
export const step = (p: Partial<Step> = {}): Step =>
  ({ id: nid(), text: 'Passo', period: 'manha', days: [0, 1, 2, 3, 4, 5, 6], ...p })
export const routine = (p: Partial<Routine> = {}): Routine =>
  ({ id: nid(), ownerUid: 'B', name: 'Rotina', order: 0, steps: [], ...p })
export const chore = (p: Partial<Chore> = {}): Chore =>
  ({ id: nid(), title: 'Tarefa', kind: 'diaria', createdKey: '2026-01-01', ...p })
export const exp = (p: Partial<Expense> = {}): Expense =>
  ({ id: nid(), uid: 'P', cents: 100, dateKey: '2026-10-01', ...p })
export const purchase = (p: Partial<Purchase> = {}): Purchase =>
  ({ id: nid(), name: 'Leite', dateKey: '2026-10-01', by: 'Ana', finishId: 'f1', ...p })
export const part = (p: Partial<Part> = {}): Part =>
  ({ id: nid(), productId: 'p1', name: 'Bifes', amount: 500, unit: 'g', ...p })
