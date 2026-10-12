/** Total de un ítem: el informado o cantidad × precio unitario. */
export function itemTotal(item) {
  const total = Number(item.total)
  if (item.total !== undefined && item.total !== null && !Number.isNaN(total)) return total
  return (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0)
}

const TOLERANCE = 0.01

/**
 * Suma de ítems frente al subtotal (adelanta el `needsReview` del roadmap de la API).
 * @returns {{ sum: number, difference: number | null, matches: boolean | null }} `null` si no hay
 *   subtotal o ítems con los que comparar.
 */
export function checkItems(items = [], subtotal) {
  const sum = Math.round(items.reduce((acc, item) => acc + itemTotal(item), 0) * 100) / 100
  const sub = Number(subtotal)
  if (items.length === 0 || subtotal === undefined || subtotal === null || Number.isNaN(sub)) {
    return { sum, difference: null, matches: null }
  }
  const difference = Math.round((sum - sub) * 100) / 100
  return { sum, difference, matches: Math.abs(difference) <= TOLERANCE }
}
