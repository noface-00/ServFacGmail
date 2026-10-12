// Formato de montos y fechas (DESIGN.md §3.4).

const moneyFormatters = new Map()

/**
 * Monto con símbolo de moneda. Si `currency` falta o no es un código ISO válido, devuelve el
 * número sin símbolo (la UI añade el chip "Moneda desconocida").
 */
export function formatMoney(amount, currency) {
  const value = Number(amount)
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(value)) return '—'
  const key = currency ?? ''
  if (!moneyFormatters.has(key)) {
    let formatter
    try {
      formatter = currency
        ? new Intl.NumberFormat('es', { style: 'currency', currency })
        : new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } catch {
      formatter = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    moneyFormatters.set(key, formatter)
  }
  return moneyFormatters.get(key).format(value)
}

/** true si `currency` es un código que Intl reconoce (USD, PEN, CLP…). */
export function isKnownCurrency(currency) {
  if (!currency) return false
  try {
    new Intl.NumberFormat('es', { style: 'currency', currency })
    return true
  } catch {
    return false
  }
}

const dateFormatter = new Intl.DateTimeFormat('es', { dateStyle: 'medium' })
const dateTimeFormatter = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })

/** Convierte ISO, timestamp o `YYYY-MM-DD` a Date; los `YYYY-MM-DD` se toman en hora local. */
export function toDate(value) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : '—'
}

export function formatDateTime(value) {
  const date = toDate(value)
  return date ? dateTimeFormatter.format(date) : '—'
}

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
]

/** "hace 3 h" — solo para lastUsedAt/updatedAt; mostrar la fecha absoluta en `title`. */
export function formatRelative(value, now = Date.now()) {
  const date = toDate(value)
  if (!date) return '—'
  const seconds = Math.round((date.getTime() - now) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second') {
      return relativeFormatter.format(Math.round(seconds / size), unit)
    }
  }
  return '—'
}
