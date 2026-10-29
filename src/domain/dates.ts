export type DateKey = string
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const WEEKDAY_LABELS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const TZ = 'Europe/Lisbon'
const DAY_MS = 86_400_000

const keyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })

export function todayKey(now: Date): DateKey {
  return keyFormat.format(now)
}

function keyToUtcMs(key: DateKey): number {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function utcMsToKey(ms: number): DateKey {
  return new Date(ms).toISOString().slice(0, 10)
}

export function weekdayOf(key: DateKey): Weekday {
  return new Date(keyToUtcMs(key)).getUTCDay() as Weekday
}

export function addDays(key: DateKey, n: number): DateKey {
  return utcMsToKey(keyToUtcMs(key) + n * DAY_MS)
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((keyToUtcMs(b) - keyToUtcMs(a)) / DAY_MS)
}

/** Wall-clock ms left until 00:00 in Lisbon (may be off by 1h on DST change days; callers re-check). */
export function msUntilNextMidnight(now: Date): number {
  const [h, m, s] = timeFormat.format(now).split(':').map(Number)
  const elapsed = ((h * 60 + m) * 60 + s) * 1000 + now.getMilliseconds()
  return DAY_MS - elapsed
}
