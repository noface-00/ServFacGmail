/** Título del documento por página (React 19 lo lleva al <head>): los lectores anuncian la ruta. */
export function PageTitle({ children }) {
  return <title>{`${children} · ServFacGmail`}</title>
}
