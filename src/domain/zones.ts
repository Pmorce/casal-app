import { normalize } from './shopping'
import type { Product, ShoppingItem, Zone } from './types'

export type ListGroup = Zone | 'oneOff' | 'semZona'

export const ZONES: { value: Zone; label: string; short: string }[] = [
  { value: 'frigorifico', label: 'Frigorífico', short: 'Frigorífico' },
  { value: 'congelador', label: 'Congelador', short: 'Congelador' },
  { value: 'despensa', label: 'Despensa', short: 'Despensa' },
  { value: 'limpeza', label: 'Limpeza e higiene', short: 'Limpeza' },
]

export const GROUP_LABEL: Record<ListGroup, string> = {
  frigorifico: 'Frigorífico',
  congelador: 'Congelador',
  despensa: 'Despensa',
  limpeza: 'Limpeza e higiene',
  oneOff: 'Só desta vez',
  semZona: 'Sem zona',
}

const GROUP_ORDER: ListGroup[] = ['frigorifico', 'congelador', 'despensa', 'limpeza', 'oneOff', 'semZona']

// word starts, without accents; freezer first, then fridge, so "creme de leite" or "gelado" are not cleaning
const MEAT = ['carne', 'frango', 'peru', 'porco', 'vaca', 'novilho', 'borrego', 'coelho', 'pato', 'bife', 'febra', 'lombo',
  'entrecosto', 'costeleta', 'hamburguer', 'almondega', 'peixe', 'salmao', 'pescada', 'bacalhau', 'dourada', 'robalo',
  'sardinha', 'carapau', 'camarao', 'lula', 'polvo']
const FROZEN = ['congelad', 'gelado', 'pizza', 'douradinho', 'lasanha']
const FRIDGE = ['leite', 'iogurte', 'queijo', 'fiambre', 'manteiga', 'natas', 'ovo', 'chourico', 'salsicha', 'presunto',
  'mozzarella', 'requeijao', 'kefir', 'fruta', 'maca', 'banana', 'laranja', 'pera', 'uva', 'morango', 'kiwi', 'legume',
  'alface', 'tomate', 'cenoura', 'courgete', 'brocolo', 'espinafre', 'salada', 'cogumelo', 'pimento', 'pepino']
const CLEANING = ['detergente', 'lixivia', 'papel higienico', 'rolo de cozinha', 'guardanapo', 'champo', 'gel', 'sabonete',
  'pasta de dentes', 'escova', 'desodorizante', 'amaciador', 'esponja', 'saco do lixo', 'sacos do lixo', 'limpa', 'toalhitas',
  'algodao', 'cotonete', 'lenco', 'fralda', 'creme', 'pensos', 'tampoes', 'lamina']

const has = (name: string, words: string[]) => words.some(w => new RegExp(String.raw`(^|\s)${w}`).test(name))

/** First guess for a new product's zone; the person confirms it with one tap. */
export function guessZone(name: string): Zone {
  const n = normalize(name)
  if (has(n, MEAT) || has(n, FROZEN)) return 'congelador'
  if (has(n, FRIDGE)) return 'frigorifico'
  if (has(n, CLEANING)) return 'limpeza'
  return 'despensa'
}

/** Which freezer tab a product's bags go to, when nobody said: meat and fish, or the rest. */
export function guessFreezerCategory(name: string): 'carne' | 'outros' {
  return has(normalize(name), MEAT) ? 'carne' : 'outros'
}

export const freezerCategoryOf = (p: Product): 'carne' | 'outros' => p.freezerCategory ?? guessFreezerCategory(p.name)

export function groupOf(item: ShoppingItem, products: Product[]): ListGroup {
  const p = item.productId ? products.find(x => x.id === item.productId) : undefined
  if (p) return p.location
  return item.oneOff ? 'oneOff' : 'semZona'
}

/** The list as walked in the supermarket: one block per zone, fixed order, empty zones left out. */
export function groupByZone(items: ShoppingItem[], products: Product[]): { group: ListGroup; items: ShoppingItem[] }[] {
  return GROUP_ORDER
    .map(group => ({
      group,
      items: items.filter(i => groupOf(i, products) === group).sort((a, b) => a.text.localeCompare(b.text, 'pt-PT')),
    }))
    .filter(g => g.items.length)
}
