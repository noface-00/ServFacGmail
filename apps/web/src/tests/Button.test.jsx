import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, IconButton } from '../components/ui/Button.jsx'

describe('Button', () => {
  it('calls onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Escanear</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Escanear' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Cancelar</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('is disabled and busy while loading, keeping its label', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Escaneando
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Escaneando' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies the variant styles', () => {
    render(<Button variant="danger">Revocar clave</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-danger')
  })

  it('IconButton exposes its label to assistive technology', () => {
    render(<IconButton icon="close" label="Cerrar" />)
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })
})
