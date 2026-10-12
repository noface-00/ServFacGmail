import { AccountSelector } from '../components/accounts/AccountSelector.jsx'
import { HealthIndicator } from '../components/layout/HealthIndicator.jsx'
import { ThemeToggle } from '../components/layout/ThemeToggle.jsx'
import { useAccounts } from '../hooks/useAccounts.js'
import { useHealth } from '../hooks/useHealth.js'
import { useKeepSelectedAccountValid, useSelectedAccount } from '../hooks/useSelectedAccount.js'
import { useSession } from '../hooks/useSession.js'
import { useTheme } from '../hooks/useTheme.js'
import { formatDateTime } from '../lib/format.js'
import { AccountProvider } from '../stores/AccountStore.jsx'
import { AppLayout } from './AppLayout.jsx'

/** AppLayout conectado a la sesión, la cuenta elegida y el estado de la API. */
export function AppShell() {
  return (
    <AccountProvider>
      <ConnectedLayout />
    </AccountProvider>
  )
}

function ConnectedLayout() {
  const { isAdmin, logout } = useSession()
  const health = useHealth()
  const { theme, setTheme } = useTheme()
  const { accounts, isSuccess, isPending } = useAccounts()
  const { selectedAccount, selectAccount } = useSelectedAccount()
  useKeepSelectedAccountValid(accounts, isSuccess)

  return (
    <AppLayout
      isAdmin={isAdmin}
      accountSelector={
        <AccountSelector accounts={accounts} value={selectedAccount} onChange={selectAccount} loading={isPending} />
      }
      health={
        <HealthIndicator status={health.status} checkedAt={health.checkedAt ? formatDateTime(health.checkedAt) : undefined} />
      }
      themeToggle={<ThemeToggle theme={theme} onChange={setTheme} />}
      onLogout={() => logout()}
    />
  )
}
