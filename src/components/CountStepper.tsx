import type { ReactNode } from 'react'
import Icon from './Icon'

export interface CountStepperProps {
  value: number
  /** the product's name, for the buttons' accessible names */
  label: string
  onMinus: () => void
  onPlus: () => void
  /** tapping the number: "Quantos há?" */
  onNumber: () => void
  /** still to count: shows "—" instead of the number */
  unknown?: boolean
  /** the number may be stale ("confirma: ainda há N?") */
  dim?: boolean
  /** shown in place of "+" (e.g. "Comprei" at 0) */
  plus?: ReactNode
}

/** − número +: the "−" is hidden at 0 (and while still to count), so the number never goes below 0 on screen. */
export default function CountStepper({ value, label, onMinus, onPlus, onNumber, unknown, dim, plus }: CountStepperProps) {
  const showMinus = !unknown && value > 0
  return (
    <span className="stepper count">
      {showMinus
        ? <button aria-label={`Menos ${label}`} onClick={onMinus}><Icon name="menos" /></button>
        : <span className="stepper-gap" aria-hidden="true" />}
      <button className={`num${dim ? ' dim' : ''}`} aria-label={`${label}: ${unknown ? 'por contar' : value}, mudar`} onClick={onNumber}>
        {unknown ? '—' : value}
      </button>
      {plus ?? <button aria-label={`Mais ${label}`} onClick={onPlus}><Icon name="mais1" /></button>}
    </span>
  )
}
