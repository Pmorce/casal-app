import type { Expense } from './types'

const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

export function parseEuros(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(t)) return null // ",5" is 0,50 €
  const cents = Math.round(Number(t) * 100)
  return cents > 0 ? cents : null
}

export function formatEuros(cents: number): string {
  return eur.format(cents / 100)
}

export function monthTotals(expenses: Expense[], year: number, month: number): { byUid: Record<string, number>; total: number } {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const byUid: Record<string, number> = {}
  let total = 0
  for (const e of expenses) {
    if (!e.dateKey.startsWith(prefix)) continue
    byUid[e.uid] = (byUid[e.uid] ?? 0) + e.cents
    total += e.cents
  }
  return { byUid, total }
}
