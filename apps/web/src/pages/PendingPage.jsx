import { EmptyState } from '../components/data/EmptyState.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'

/** Ruta ya definida cuya pantalla llega en una fase posterior del plan (PLAN.md). */
export default function PendingPage({ title, phase, icon = 'construction' }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} />
      <div className="rounded-md border border-border bg-surface">
        <EmptyState icon={icon} title="Pantalla en construcción" description={`Esta vista se implementa en la Fase ${phase}.`} />
      </div>
    </div>
  )
}
