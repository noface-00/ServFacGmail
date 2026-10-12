import { cn } from '../../lib/cn.js'

/** Bloque de relleno mientras cargan los datos. El tamaño se da con clases (h-4 w-24…). */
export function Skeleton({ className }) {
  return <span aria-hidden className={cn('block animate-pulse rounded-sm bg-surface-muted', className)} />
}
