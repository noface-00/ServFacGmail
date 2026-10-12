import { Input } from '../ui/Input.jsx'

/** Fecha nativa (valor `YYYY-MM-DD`, el formato que espera la API en `sinceDate`). */
export function DateInput(props) {
  return <Input type="date" icon="calendar_today" mono {...props} />
}
