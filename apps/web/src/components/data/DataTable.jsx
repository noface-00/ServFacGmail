import { useMemo, useState } from 'react'
import { cn } from '../../lib/cn.js'
import { errorTone, isRetryable } from '../../lib/errorTone.js'
import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'
import { EmptyState } from './EmptyState.jsx'

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })

function compare(a, b) {
  if (a === b) return 0
  if (a === null || a === undefined || a === '') return 1
  if (b === null || b === undefined || b === '') return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return collator.compare(String(a), String(b))
}

/**
 * Tabla de datos (DESIGN.md §4.8) con orden en cliente y estados loading / empty / error.
 *
 * @typedef {{
 *   key: string,
 *   header: import('react').ReactNode,
 *   render?: (row: any) => import('react').ReactNode,
 *   sortValue?: (row: any) => unknown,
 *   sortable?: boolean,
 *   align?: 'left' | 'right' | 'center',
 *   mono?: boolean,
 *   className?: string,
 *   headerClassName?: string,
 * }} Column
 *
 * @param {{
 *   columns: Column[],
 *   rows: any[],
 *   rowKey: (row: any) => string,
 *   caption?: string,
 *   loading?: boolean,
 *   error?: { status?: number, userMessage: string, technicalError?: string } | null,
 *   onRetry?: () => void,
 *   empty?: import('react').ReactNode,
 *   initialSort?: { key: string, direction: 'asc' | 'desc' },
 *   rowClassName?: (row: any) => string | undefined,
 *   onRowClick?: (row: any) => void,
 * }} props
 */
export function DataTable({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  error = null,
  onRetry,
  empty,
  initialSort,
  rowClassName,
  onRowClick,
  className,
}) {
  const [sort, setSort] = useState(initialSort ?? null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column) return rows
    const getValue = column.sortValue ?? ((row) => row[column.key])
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => factor * compare(getValue(a), getValue(b)))
  }, [rows, columns, sort])

  function toggleSort(key) {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  if (error) {
    return (
      <Alert
        tone={errorTone(error)}
        title={error.userMessage}
        technicalError={error.technicalError}
        action={
          onRetry &&
          isRetryable(error) && (
            <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
              Reintentar
            </Button>
          )
        }
      />
    )
  }

  const showEmpty = !loading && rows.length === 0

  return (
    <div className={cn('overflow-x-auto rounded-md border border-border bg-surface', className)}>
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="sticky top-0 bg-surface-muted">
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key
              const ariaSort = column.sortable ? (active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    'h-9 border-b border-border px-3 text-xs font-semibold tracking-wide whitespace-nowrap text-fg-muted uppercase',
                    alignClass(column.align),
                    column.headerClassName,
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 uppercase hover:text-fg',
                        column.align === 'right' && 'flex-row-reverse',
                        active && 'text-fg',
                      )}
                    >
                      {column.header}
                      <Icon
                        name={active ? (sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        size={14}
                        className={active ? undefined : 'opacity-50'}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }, (_, i) => (
              <tr key={`skeleton-${i}`} className="h-11 border-b border-border last:border-b-0">
                {columns.map((column) => (
                  <td key={column.key} className="px-3">
                    <Skeleton className={cn('h-3.5', column.align === 'right' ? 'ml-auto w-16' : 'w-3/4')} />
                  </td>
                ))}
              </tr>
            ))}
          {!loading &&
            sorted.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'h-11 border-b border-border transition-colors last:border-b-0 hover:bg-surface-muted',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2 align-middle text-fg',
                      alignClass(column.align),
                      column.mono && 'tabular',
                      column.className,
                    )}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          {showEmpty && (
            <tr>
              <td colSpan={columns.length}>{empty ?? <EmptyState title="Sin resultados" />}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function alignClass(align) {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}
