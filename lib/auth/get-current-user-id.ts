import { auth } from '@/lib/auth'

/**
 * Get the current authenticated user's ID from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}
