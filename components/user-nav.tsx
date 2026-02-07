'use client';

import { signOut, useSession } from 'next-auth/react';

export function UserNav() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm">
        <p className="font-medium text-gray-900">{session.user.name || 'User'}</p>
        <p className="text-gray-500">{session.user.email}</p>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
      >
        Sign out
      </button>
    </div>
  );
}
