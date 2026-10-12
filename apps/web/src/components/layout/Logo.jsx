import logo from '../../assets/logos/logo.svg'

export function Logo({ compact = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src={logo} alt="" width={28} height={28} className="h-7 w-7" />
      {!compact && <span className="text-md font-semibold tracking-tight text-fg">ServFacGmail</span>}
    </span>
  )
}
