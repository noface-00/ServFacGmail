// Exportación CSV en el cliente (DESIGN.md §5.3). Separador ";" y BOM UTF-8 para que Excel en
// español lo abra en columnas y con tildes; montos sin formato (punto decimal).

const SEPARATOR = ';'

/** Escapa una celda y neutraliza fórmulas (=, +, -, @) para evitar inyección en hojas de cálculo. */
export function csvCell(value) {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[";\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

/**
 * @param {Array<object>} rows
 * @param {Array<{ header: string, value: (row: object) => unknown }>} columns
 */
export function toCsv(rows, columns) {
  const lines = [columns.map((c) => csvCell(c.header)).join(SEPARATOR)]
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(SEPARATOR))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
