import { useEffect, useState } from 'react'

/**
 * Segundos que faltan de una espera, actualizados cada segundo; 0 al terminar o sin espera.
 * @param {{ from: number, until: number } | null} span instante de inicio y de fin (ms). El
 *   inicio lo fija quien crea la espera (en un manejador de eventos), así la primera cifra es exacta.
 */
export function useCountdown(span) {
  const [tick, setTick] = useState(null)

  useEffect(() => {
    if (!span) return
    const timer = setInterval(() => {
      const current = Date.now()
      setTick({ span, now: current })
      if (current >= span.until) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [span])

  if (!span) return 0
  const now = tick?.span === span ? tick.now : span.from
  return Math.max(0, Math.ceil((span.until - now) / 1000))
}
