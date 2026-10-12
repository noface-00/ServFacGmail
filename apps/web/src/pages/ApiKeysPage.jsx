import { useMemo, useState } from 'react'
import { CreateKeyDialog } from '../components/admin/CreateKeyDialog.jsx'
import { RevokeDialog } from '../components/admin/RevokeDialog.jsx'
import { SecretRevealDialog } from '../components/admin/SecretRevealDialog.jsx'
import { DataTable } from '../components/data/DataTable.jsx'
import { EmptyState } from '../components/data/EmptyState.jsx'
import { AdminSection } from '../components/layout/AdminSection.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useAccounts } from '../hooks/useAccounts.js'
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../hooks/useApiKeys.js'
import { useToast } from '../hooks/useToast.js'
import { formatDate, formatDateTime, formatRelative } from '../lib/format.js'

/** Administración → Claves de API (DESIGN.md §5.5). */
export default function ApiKeysPage() {
  const { apiKeys, isPending, error, refetch } = useApiKeys()
  const { accounts } = useAccounts()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()
  const toast = useToast()

  const [showRevoked, setShowRevoked] = useState(false)
  const [createOpen, setCreateOpen] = useState(0) // contador: cada apertura monta un formulario nuevo
  // La clave en claro solo vive aquí, en estado local, hasta que se cierra el diálogo de revelado.
  const [revealed, setRevealed] = useState(null)
  const [toRevoke, setToRevoke] = useState(null)

  const revokedCount = apiKeys.filter((k) => k.revokedAt).length
  const rows = useMemo(() => (showRevoked ? apiKeys : apiKeys.filter((k) => !k.revokedAt)), [apiKeys, showRevoked])

  function openCreate() {
    createKey.reset()
    setCreateOpen((n) => n + 1)
  }

  function submitCreate(input) {
    createKey.mutate(input, {
      onSuccess: (data) => {
        setCreateOpen(0)
        setRevealed({ secret: data.key, name: data.apiKey?.name ?? input.name, message: data.userMessage })
        // Sin observadores y con gcTime 0, la mutación (y la clave) salen de la caché.
        createKey.reset()
      },
    })
  }

  function openRevoke(apiKey) {
    revokeKey.reset()
    setToRevoke(apiKey)
  }

  function confirmRevoke(id) {
    const name = toRevoke?.name
    revokeKey.mutate(id, {
      onSuccess: (data) => {
        setToRevoke(null)
        toast.show({ tone: 'success', title: data?.userMessage ?? 'Clave revocada correctamente.', description: name })
      },
      onError: (err) => {
        if (err.status === 404) {
          setToRevoke(null)
          toast.show({ tone: 'info', title: err.userMessage, description: name })
        }
      },
    })
  }

  const columns = [
    { key: 'name', header: 'Nombre', sortable: true, render: (k) => <span className="font-medium">{k.name}</span> },
    { key: 'keyPrefix', header: 'Prefijo', mono: true, render: (k) => `${k.keyPrefix}…` },
    {
      key: 'allowedAccounts',
      header: 'Alcance',
      sortValue: (k) => k.allowedAccounts.length,
      sortable: true,
      render: (k) =>
        k.allowedAccounts.length === 0 ? (
          <Badge>Todas las cuentas</Badge>
        ) : (
          <Badge tone="info" title={k.allowedAccounts.join('\n')}>
            {k.allowedAccounts.length === 1 ? k.allowedAccounts[0] : `${k.allowedAccounts.length} cuentas`}
          </Badge>
        ),
    },
    {
      key: 'createdAt',
      header: 'Creada',
      sortable: true,
      sortValue: (k) => new Date(k.createdAt),
      render: (k) => <span title={formatDateTime(k.createdAt)}>{formatDate(k.createdAt)}</span>,
    },
    {
      key: 'lastUsedAt',
      header: 'Último uso',
      sortable: true,
      sortValue: (k) => (k.lastUsedAt ? new Date(k.lastUsedAt) : null),
      render: (k) =>
        k.lastUsedAt ? (
          <span className="text-fg-muted" title={formatDateTime(k.lastUsedAt)}>
            {formatRelative(k.lastUsedAt)}
          </span>
        ) : (
          <span className="text-fg-subtle">Nunca</span>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (k) =>
        k.revokedAt ? (
          <span title={`Revocada el ${formatDateTime(k.revokedAt)}`}>
            <Badge preset="revoked" />
          </span>
        ) : (
          <Badge preset="active" />
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Acciones</span>,
      align: 'right',
      render: (k) =>
        !k.revokedAt && (
          <Button size="sm" variant="dangerGhost" icon="block" aria-label={`Revocar ${k.name}`} onClick={() => openRevoke(k)}>
            Revocar
          </Button>
        ),
    },
  ]

  return (
    <AdminSection
      title="Claves de API"
      description="Cada sistema que consulta el servicio usa su propia clave, limitada a las cuentas que necesite."
      actions={
        <Button variant="admin" icon="add" onClick={openCreate}>
          Crear clave
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted select-none">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--sf-admin)]"
            checked={showRevoked}
            onChange={(e) => setShowRevoked(e.target.checked)}
          />
          Mostrar revocadas{revokedCount > 0 && ` (${revokedCount})`}
        </label>
        <span className="text-xs text-fg-muted">{rows.length} claves</span>
      </div>

      <DataTable
        caption="Claves de API"
        columns={columns}
        rows={rows}
        rowKey={(k) => k.id}
        loading={isPending}
        error={error}
      onRetry={refetch}
        rowClassName={(k) => (k.revokedAt ? 'opacity-60' : undefined)}
        empty={
          apiKeys.length > 0 ? (
            <EmptyState icon="key_off" title="Todas las claves están revocadas" description="Active «Mostrar revocadas» para verlas." />
          ) : (
            <EmptyState
              icon="key"
              title="Aún no hay claves de API"
              description="Cree una por cada sistema que vaya a consultar el servicio."
              action={
                <Button variant="admin" icon="add" onClick={openCreate}>
                  Crear clave
                </Button>
              }
            />
          )
        }
      />

      {createOpen > 0 && (
        <CreateKeyDialog
          key={createOpen}
          open
          onClose={() => setCreateOpen(0)}
          onSubmit={submitCreate}
          loading={createKey.isPending}
          error={createKey.error}
          suggestions={accounts.map((a) => a.email)}
        />
      )}

      <SecretRevealDialog
        key={revealed?.secret ?? 'none'}
        secret={revealed?.secret ?? null}
        name={revealed?.name}
        message={revealed?.message}
        onDone={() => setRevealed(null)}
      />

      <RevokeDialog
        apiKey={toRevoke}
        loading={revokeKey.isPending}
        error={revokeKey.error?.status === 404 ? null : revokeKey.error}
        onConfirm={confirmRevoke}
        onClose={() => setToRevoke(null)}
      />
    </AdminSection>
  )
}
