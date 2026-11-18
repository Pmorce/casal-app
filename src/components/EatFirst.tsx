import { useState } from 'react'
import { backToFreezer, cook, deleteBag, moveToFridge, restoreBag, undoCook, updateBag, useDose as eatDose } from '../data/freezerRepo'
import { fridgeDays, FRIDGE_WARN_DAYS } from '../domain/stock'
import { madeFromOf } from '../domain/freezer'
import { daysBetween, type DateKey } from '../domain/dates'
import type { FreezerBag } from '../domain/types'
import CookedForm from './CookedForm'
import Icon from './Icon'

const num = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 })
const UNIT_LABEL = { un: 'un.', g: 'g', kg: 'kg', doses: 'doses' } as const
const ddmm = (key: DateKey) => `${key.slice(8, 10)}/${key.slice(5, 7)}`

function since(key: DateKey, today: DateKey): string {
  const d = daysBetween(key, today)
  return d < 1 ? 'hoje' : d === 1 ? 'ontem' : ddmm(key)
}

/**
 * The Frigorífico tab's top (spec §5.7): what is thawing and the comida feita kept in the fridge, oldest first.
 * Every change reports one undo through `onUndo`. Nothing is shown without bags.
 */
export default function EatFirst({ bags, today, names, onUndo }: {
  bags: FreezerBag[]
  today: DateKey
  names: string[]
  onUndo: (message: string, run: () => void) => void
}) {
  const [cooking, setCooking] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  if (!bags.length) return null

  function cooked(b: FreezerBag, input: { name: string; freezerDoses: number; fridgeDoses: number }) {
    setCooking(null)
    const done = cook({ ...input, madeFrom: madeFromOf(b) }, today, b)
    onUndo('Cozinhei', () => undoCook(done))
  }

  function nothing(b: FreezerBag) {
    setCooking(null)
    deleteBag(b.id)
    onUndo('Saco retirado', () => restoreBag(b))
  }

  return (
    <div className="card">
      <h2 className="state-title">Para comer primeiro</h2>
      {bags.map(b => {
        const amount = `${num.format(b.amount).replace(/\s/g, '')} ${UNIT_LABEL[b.unit]}`
        if (b.category === 'feita') {
          const days = fridgeDays(b, today)
          const dose = b.unit === 'doses'
          return (
            <div className="row" key={b.id}>
              <div className="grow">
                <div className="product-name">{b.name}</div>
                <div className="note">
                  comida feita · no frigorífico há {days} {days === 1 ? 'dia' : 'dias'}
                  {b.madeFrom ? ` · feito a ${ddmm(b.addedKey)} com ${b.madeFrom}` : ''}
                </div>
                {days >= FRIDGE_WARN_DAYS && <span className="old-tag"><Icon name="relogio" />{days} dias<span className="sr-only">come primeiro</span></span>}
              </div>
              <span className="stepper">
                <button aria-label={`Menos ${b.name}`} onClick={() => { const was = eatDose(b); onUndo(`${b.name}: uma dose`, () => restoreBag(was)) }}>
                  <Icon name="menos" />
                </button>
                <b aria-live="polite">{dose ? b.amount : amount}</b>
                {dose
                  ? <button aria-label={`Mais ${b.name}`} onClick={() => updateBag(b, { amount: b.amount + 1 })}><Icon name="mais1" /></button>
                  : <span className="stepper-gap" aria-hidden="true" />}
              </span>
            </div>
          )
        }
        return (
          <div key={b.id}>
            <div className="row">
              <div className="grow">
                <div className="product-name">{b.name} {amount}</div>
                <div className="note">a descongelar desde {since(b.movedKey ?? b.addedKey, today)}</div>
              </div>
              <button className="chip" aria-label={`Cozinhei ${b.name}`} onClick={() => { setMenu(null); setCooking(cooking === b.id ? null : b.id) }}>Cozinhei</button>
              <button className="chip quiet" aria-label={`Mais opções de ${b.name}`} aria-expanded={menu === b.id}
                onClick={() => { setCooking(null); setMenu(menu === b.id ? null : b.id) }}>Mais</button>
            </div>
            {menu === b.id && (
              <div className="row-menu">
                <button className="chip line" onClick={() => {
                  setMenu(null); deleteBag(b.id); onUndo('Saco retirado', () => restoreBag(b))
                }}>Acabou / deitar fora</button>
                <button className="chip line" onClick={() => {
                  setMenu(null); backToFreezer(b); onUndo('Voltou ao congelador', () => moveToFridge(b, b.movedKey ?? today))
                }}>Voltar ao congelador</button>
              </div>
            )}
            {cooking === b.id && (
              <CookedForm origin={madeFromOf(b)} names={names} onSave={input => cooked(b, input)} onNothing={() => nothing(b)} onCancel={() => setCooking(null)} />
            )}
          </div>
        )
      })}
    </div>
  )
}
