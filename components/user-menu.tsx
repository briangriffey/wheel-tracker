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
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-700">
        {user.name || user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Sign Out
      </button>
    </div>
  )
}
