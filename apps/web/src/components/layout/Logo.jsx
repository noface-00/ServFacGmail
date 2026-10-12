import logo from '../../assets/logos/logo.svg'

/** Logo con el nombre. `collapseOnMobile` deja solo el icono bajo 640 px (el nombre sigue para lectores). */
export function Logo({ compact = false, collapseOnMobile = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src={logo} alt="" width={28} height={28} className="h-7 w-7" />
      {!compact && (
        <span className={collapseOnMobile ? 'text-md font-semibold tracking-tight text-fg max-sm:sr-only' : 'text-md font-semibold tracking-tight text-fg'}>
          ServFacGmail
        </span>
      )}
    </span>
  )
}
