'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/design-system/button/button'

interface UserMenuProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const userName = user.name || user.email || 'User'

  return (
    <div className="flex items-center gap-4" role="navigation" aria-label="User menu">
      <span className="text-sm text-gray-700" aria-label={`Logged in as ${userName}`}>
        {userName}
      </span>
      <Button
        onClick={() => signOut({ callbackUrl: '/' })}
        variant="destructive"
        size="sm"
        aria-label={`Sign out ${userName}`}
      >
        Sign Out
      </Button>
    </div>
  )
}
