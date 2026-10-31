import { greeting, periodAt, momentLine, memberColor, routinesLine } from './look'

test('greeting boundaries', () => {
  expect([5, 6, 11, 12, 19, 20, 23, 0].map(greeting)).toEqual(
    ['Boa noite', 'Bom dia', 'Bom dia', 'Boa tarde', 'Boa tarde', 'Boa noite', 'Boa noite', 'Boa noite'])
})
test('period switches at 15:00', () => {
  expect([0, 14, 15, 23].map(periodAt)).toEqual(['manha', 'manha', 'noite', 'noite'])
})
const base = { period: 'manha' as const, routine: null, choresDue: 0, maybeMissing: 0 }
test('moment line: rule order and copy', () => {
  expect(momentLine({ ...base, routine: { done: 2, total: 3 }, choresDue: 4 })).toBe('Falta só um passo para fechares a manhã ✨')
  expect(momentLine({ ...base, period: 'noite', routine: { done: 3, total: 3 } })).toBe('Noite fechada. Bom trabalho ✨')
  expect(momentLine({ ...base, routine: { done: 0, total: 3 }, choresDue: 1 })).toBe('Hoje há 1 tarefa da casa')
  expect(momentLine({ ...base, choresDue: 2 })).toBe('Hoje há 2 tarefas da casa')
  expect(momentLine({ ...base, maybeMissing: 1 })).toBe('1 coisa pode estar a acabar')
  expect(momentLine({ ...base, maybeMissing: 3 })).toBe('3 coisas podem estar a acabar')
  expect(momentLine(base)).toBe('Dia tranquilo por aqui')
})
test('memberColor: alphabetical uid order, neutral for unknown', () => {
  const members = { zz9: 'Rui', aa1: 'Ana' }
  expect(memberColor('aa1', members)).toEqual({ bg: '#B9D6E8', ink: '#2E5873', initial: 'A' })
  expect(memberColor('zz9', members)).toEqual({ bg: '#F2B8C6', ink: '#7A3550', initial: 'R' })
  expect(memberColor('gone', members).initial).toBe('?')
})
test('rotinas help line', () => {
  expect(routinesLine(1, 0)).toBe('1 rotina · 0 checklists')
  expect(routinesLine(3, 1)).toBe('3 rotinas · 1 checklist')
})
