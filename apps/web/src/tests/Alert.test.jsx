import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from '../components/ui/Alert.jsx'

describe('Alert', () => {
  it('uses role="alert" for danger and role="status" otherwise', () => {
    const { rerender } = render(<Alert tone="danger" title="Falló" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Falló')
    rerender(<Alert tone="warning" title="Atención" />)
    expect(screen.getByRole('status')).toHaveTextContent('Atención')
  })

  it('hides the technical detail inside a collapsed <details>', async () => {
    render(<Alert tone="danger" title="No se pudo escanear" technicalError="invalid_grant" />)
    const details = screen.getByText('Detalle técnico').closest('details')
    expect(details).not.toHaveAttribute('open')
    await userEvent.click(screen.getByText('Detalle técnico'))
    expect(details).toHaveAttribute('open')
    expect(screen.getByText('invalid_grant')).toBeVisible()
  })

  it('copies the technical error to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<Alert tone="danger" title="Error" technicalError="Error: timeout of 15000ms exceeded" />)
    await user.click(screen.getByText('Detalle técnico'))
    await user.click(screen.getByRole('button', { name: 'Copiar' }))
    expect(writeText).toHaveBeenCalledWith('Error: timeout of 15000ms exceeded')
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument()
  })

  it('omits the technical detail when there is none', () => {
    render(<Alert tone="info" title="Cuenta no conectada" />)
    expect(screen.queryByText('Detalle técnico')).not.toBeInTheDocument()
  })
})
