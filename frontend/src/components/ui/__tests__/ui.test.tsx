import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Button } from '@/components/ui/Button'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'conditional', false && 'not-included')).toBe('base conditional')
  })

  it('handles tailwind merge conflicts', () => {
    expect(cn('p-2 p-4')).toBe('p-4')
  })
})

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveClass('bg-[var(--destructive)]')
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled()
    expect(screen.getByRole('button')).toContainHTML('svg')
  })

  it('calls onClick handler', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

describe('Toast', () => {
  const renderWithToast = (children: React.ReactNode) => {
    return render(<ToastProvider>{children}</ToastProvider>)
  }

  it('shows toast when showToast is called', () => {
    function TestComponent() {
      const { showToast } = useToast()
      return <button onClick={() => showToast('Test message', 'success')}>Show Toast</button>
    }

    renderWithToast(<TestComponent />)
    fireEvent.click(screen.getByRole('button', { name: 'Show Toast' }))
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('auto dismisses after duration', async () => {
    function TestComponent() {
      const { showToast } = useToast()
      return <button onClick={() => showToast('Auto dismiss', 'info', 100)}>Show Toast</button>
    }

    renderWithToast(<TestComponent />)
    fireEvent.click(screen.getByRole('button', { name: 'Show Toast' }))
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument()
    }, { timeout: 1000 })
  })
})

describe('Theme', () => {
  const renderWithTheme = (children: React.ReactNode) => {
    return render(<ThemeProvider defaultTheme="light">{children}</ThemeProvider>)
  }

  it('provides theme context', () => {
    function TestComponent() {
      const { theme, resolvedTheme } = useTheme()
      return (
        <div>
          <span data-testid="theme">{theme}</span>
          <span data-testid="resolved">{resolvedTheme}</span>
        </div>
      )
    }

    renderWithTheme(<TestComponent />)
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
  })

  it('toggles theme', () => {
    function TestComponent() {
      const { theme, toggleTheme } = useTheme()
      return (
        <div>
          <span data-testid="theme">{theme}</span>
          <button onClick={toggleTheme}>Toggle</button>
        </div>
      )
    }

    renderWithTheme(<TestComponent />)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })
})