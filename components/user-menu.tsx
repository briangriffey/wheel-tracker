'use client'

import { signOut } from 'next-auth/react'

interface UserMenuProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <span className="hidden sm:inline text-sm text-gray-700 truncate max-w-[150px]">
        {user.name || user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="text-sm px-4 py-2 min-h-[44px] bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
        aria-label="Sign out"
      >
        Sign Out
      </button>
    </div>
  )
}
