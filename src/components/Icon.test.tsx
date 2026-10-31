import { render } from '@testing-library/react'
import Icon, { Badge, type IconName } from './Icon'

const NAMES: IconName[] = [
  'hoje', 'compras', 'congelador', 'casa', 'mais', 'sol', 'lua', 'vassoura', 'lista', 'euro', 'frigorifico',
  'despensa', 'limpeza', 'peixe', 'panela', 'floco', 'check', 'x', 'mais1', 'menos', 'acima', 'abaixo', 'seta', 'voltar', 'relogio', 'sair',
]

test.each(NAMES)('the %s icon is a decorative svg with a drawing', name => {
  const { container } = render(<Icon name={name} />)
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('aria-hidden')).toBe('true')
  expect(svg?.querySelectorAll('path, circle, rect').length).toBeGreaterThan(0)
})

test('a badge wraps its icon in the tone it is given', () => {
  const { container } = render(<Badge icon="sol" tone="pessego" />)
  expect(container.querySelector('.badge.pessego svg')).not.toBeNull()
})
