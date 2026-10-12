import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../components/ui/Button.jsx'
import { Dialog } from '../components/ui/Dialog.jsx'

function Harness({ dismissible = true, onClose = () => {} }) {
  const [open, setOpen] = useState(false)
  const close = () => {
    onClose()
    setOpen(false)
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir</Button>
      <Dialog
        open={open}
        onClose={close}
        dismissible={dismissible}
        title="¿Revocar la clave?"
        description="Los sistemas que la usen perderán el acceso."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={close}>
              Revocar clave
            </Button>
          </>
        }
      />
    </>
  )
}

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is labelled by its title and description and moves focus inside', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialog = screen.getByRole('dialog', { name: '¿Revocar la clave?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('Los sistemas que la usen perderán el acceso.')
    expect(dialog).toContainElement(document.activeElement)
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Abrir' })
    await userEvent.click(trigger)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('traps focus with Tab and Shift+Tab', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    const close = screen.getByRole('button', { name: 'Cerrar' })
    const revoke = screen.getByRole('button', { name: 'Revocar clave' })
    expect(close).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(revoke).toHaveFocus()
    await userEvent.tab()
    expect(close).toHaveFocus()
  })

  it('ignores Escape and hides the close button when not dismissible', async () => {
    const onClose = vi.fn()
    render(<Harness dismissible={false} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
