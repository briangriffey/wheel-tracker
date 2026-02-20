'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UpgradeNavCta } from '@/components/billing/upgrade-nav-cta'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/trades', label: 'Trades' },
  { href: '/positions', label: 'Positions' },
  { href: '/wheels', label: 'Wheels' },
  { href: '/deposits', label: 'Deposits' },
  { href: '/help', label: 'Help' },
  { href: '/billing', label: 'Billing' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-neutral-700 hover:text-neutral-900"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
      {open && (
        <nav
          className="absolute left-0 right-0 top-16 bg-white shadow-lg border-t border-neutral-200 z-50"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col px-4 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`py-3 text-sm border-b border-neutral-100 ${
                  link.label === 'Help'
                    ? 'text-blue-600 hover:text-blue-800 font-medium'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="py-3">
              <UpgradeNavCta />
            </div>
          </div>
        </nav>
      )}
    </div>
  )
}
