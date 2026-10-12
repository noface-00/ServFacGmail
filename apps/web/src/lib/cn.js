/** Une clases condicionales: cn('a', cond && 'b', null) → 'a b'. */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
