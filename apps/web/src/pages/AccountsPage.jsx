import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ConnectAccountDialog } from '../components/accounts/ConnectAccountDialog.jsx'
import { DisconnectDialog } from '../components/accounts/DisconnectDialog.jsx'
import { DataTable } from '../components/data/DataTable.jsx'
import { EmptyState } from '../components/data/EmptyState.jsx'
import { AdminSection } from '../components/layout/AdminSection.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { PageTitle } from '../components/layout/PageTitle.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useAccounts, useDisconnectAccount } from '../hooks/useAccounts.js'
import { useConnectAccount } from '../hooks/useConnectAccount.js'
import { useSelectedAccount } from '../hooks/useSelectedAccount.js'
import { useSession } from '../hooks/useSession.js'
import { useToast } from '../hooks/useToast.js'
import { formatDate, formatDateTime, formatRelative } from '../lib/format.js'

const HIGHLIGHT_MS = 2000

/**
 * Cuentas de Gmail (DESIGN.md §5.2 y §5.6). La misma vista sirve en /cuentas y, con
 * `adminView`, en /admin/cuentas; las acciones de administración dependen del rol, no de la ruta.
 */
export default function AccountsPage({ adminView = false }) {
  const { isAdmin } = useSession()
  const { accounts, isPending, error, refetch } = useAccounts()
  const { selectAccount } = useSelectedAccount()
  const navigate = useNavigate()
  const toast = useToast()

  const [connectOpen, setConnectOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(null)
  const [toDisconnect, setToDisconnect] = useState(null)

  const connect = useConnectAccount({
    onConnected: (email) => {
      setConnectOpen(false)
      setHighlighted(email)
      toast.show({ tone: 'success', title: 'Cuenta conectada', description: email })
    },
  })
  const disconnect = useDisconnectAccount()

  useEffect(() => {
    if (!highlighted) return
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlighted])

  function openConnect() {
    setConnectOpen(true)
  }

  function closeConnect() {
    connect.cancel()
    setConnectOpen(false)
  }

  function scanWith(email) {
    selectAccount(email)
    navigate('/escanear/recibidas')
  }

  function openDisconnect(email) {
    disconnect.reset()
    setToDisconnect(email)
  }

  function confirmDisconnect(email) {
    disconnect.mutate(email, {
      onSuccess: (data) => {
        setToDisconnect(null)
        toast.show({ tone: 'success', title: data?.userMessage ?? 'Cuenta desconectada correctamente.', description: email })
      },
      onError: (err) => {
        // 404: alguien ya la desconectó; la lista se refresca igual (onSettled del hook).
        if (err.status === 404) {
          setToDisconnect(null)
          toast.show({ tone: 'info', title: err.userMessage, description: email })
        }
      },
    })
  }

  const columns = [
    {
      key: 'email',
      header: 'Correo',
      sortable: true,
      render: (a) => <span className="tabular text-sm font-medium">{a.email}</span>,
    },
    {
      key: 'connectedAt',
      header: 'Conectada el',
      sortable: true,
      sortValue: (a) => new Date(a.connectedAt),
      render: (a) => <span title={formatDateTime(a.connectedAt)}>{formatDate(a.connectedAt)}</span>,
    },
    {
      key: 'updatedAt',
      header: 'Última actualización de token',
      sortable: true,
      sortValue: (a) => new Date(a.updatedAt),
      render: (a) => (
        <span className="text-fg-muted" title={formatDateTime(a.updatedAt)}>
          {formatRelative(a.updatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Acciones</span>,
      align: 'right',
      render: (a) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" icon="document_scanner" onClick={() => scanWith(a.email)}>
            Escanear
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="dangerGhost"
              icon="link_off"
              aria-label={`Desconectar ${a.email}`}
              onClick={() => openDisconnect(a.email)}
            >
              Desconectar
            </Button>
          )}
        </div>
      ),
    },
  ]

  const connectButton = isAdmin && (
    <Button variant="admin" icon="add_link" onClick={openConnect}>
      Conectar cuenta de Gmail
    </Button>
  )

  const empty = isAdmin ? (
    <EmptyState
      icon="mail"
      title="No hay cuentas conectadas"
      description="Conecte una cuenta de Gmail para empezar a buscar facturas."
      action={connectButton}
    />
  ) : (
    <EmptyState
      icon="mail"
      title="No hay cuentas conectadas"
      description="Pida a un administrador que conecte una cuenta o que le dé acceso a ella."
    />
  )

  const table = (
    <DataTable
      caption="Cuentas de Gmail conectadas"
      columns={columns}
      rows={accounts}
      rowKey={(a) => a.email}
      loading={isPending}
      error={error}
      onRetry={refetch}
      empty={empty}
      initialSort={{ key: 'email', direction: 'asc' }}
      rowClassName={(a) => (a.email === highlighted ? 'bg-primary-soft' : undefined)}
    />
  )

  return (
    <>
      <PageTitle>{adminView ? 'Cuentas de Gmail' : 'Cuentas'}</PageTitle>
      {adminView ? (
        <AdminSection
          title="Cuentas de Gmail"
          description="Conecte o desconecte las bandejas que el servicio puede leer."
          actions={connectButton}
        >
          {table}
        </AdminSection>
      ) : (
        <div className="flex flex-col gap-4">
          <PageHeader
            title="Cuentas"
            description={isAdmin ? 'Bandejas de Gmail conectadas al servicio.' : 'Bandejas de Gmail que su clave puede escanear.'}
            actions={connectButton}
          />
          {table}
        </div>
      )}

      {isAdmin && (
        <>
          <ConnectAccountDialog
            open={connectOpen}
            status={connect.status}
            authUrl={connect.authUrl}
            expiresAt={connect.expiresAt}
            error={connect.error}
            onStart={connect.start}
            onCancel={closeConnect}
          />
          <DisconnectDialog
            key={toDisconnect ?? 'none'}
            open={Boolean(toDisconnect)}
            email={toDisconnect}
            loading={disconnect.isPending}
            error={disconnect.error?.status === 404 ? null : disconnect.error}
            onConfirm={confirmDisconnect}
            onClose={() => setToDisconnect(null)}
          />
        </>
      )}
    </>
  )
}
