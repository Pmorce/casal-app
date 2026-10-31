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

test('Casa (the tab) and Despensa (the zone) are different drawings', () => {
  const draw = (name: IconName) => render(<Icon name={name} />).container.querySelector('svg')!.innerHTML
  expect(draw('casa')).not.toBe(draw('despensa'))
})

// two-colour style: a soft patch of colour inside the outline
test.each<IconName>(['hoje', 'compras', 'casa', 'mais', 'frigorifico', 'despensa', 'limpeza', 'sol', 'lua', 'vassoura', 'panela', 'peixe'])(
  'the %s icon has a tint patch under its outline', name => {
    const svg = render(<Icon name={name} />).container.querySelector('svg')!
    const tint = svg.querySelector('.tint')
    expect(tint).not.toBeNull()
    expect(svg.firstElementChild).toBe(tint) // drawn first, so the outline sits on top
  })
