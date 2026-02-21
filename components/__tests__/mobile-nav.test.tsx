import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileNav } from '../mobile-nav'

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: { children: React.ReactNode; href: string; onClick?: () => void; className?: string }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

vi.mock('@/components/billing/upgrade-nav-cta', () => ({
  UpgradeNavCta: () => <div data-testid="upgrade-cta">Upgrade</div>,
}))

describe('MobileNav', () => {
  it('renders the hamburger button', () => {
    render(<MobileNav />)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('menu is closed by default', () => {
    render(<MobileNav />)
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })

  it('clicking hamburger opens the menu and shows all nav links', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Trades')).toBeInTheDocument()
    expect(screen.getByText('Positions')).toBeInTheDocument()
    expect(screen.getByText('Wheels')).toBeInTheDocument()
    expect(screen.getByText('Deposits')).toBeInTheDocument()
    expect(screen.getByText('Help')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
  })

  it('clicking a link closes the menu', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Dashboard'))
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })

  it('clicking the close (X) button closes the menu', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })

  it('shows user info and sign out in the open menu', () => {
    render(<MobileNav user={{ name: 'John Doe', email: 'john@example.com' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('displays email when name is not provided', () => {
    render(<MobileNav user={{ email: 'john@example.com' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('does not show user section when no user prop', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
  })

  it('calls signOut when sign out button is clicked', async () => {
    const { signOut } = await import('next-auth/react')
    render(<MobileNav user={{ name: 'John' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    fireEvent.click(screen.getByText('Sign Out'))

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('has proper aria-expanded attribute', () => {
    render(<MobileNav />)
    const button = screen.getByRole('button', { name: 'Open menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('has proper aria-label on the hamburger button', () => {
    render(<MobileNav />)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument()
  })
})
