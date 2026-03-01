'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

type ActionResult = { success: true } | { success: false; error: string }

/**
 * Mark the current user's onboarding as completed.
 * Called when the user completes, skips, or clicks a CTA on the onboarding slideshow.
 */
export async function completeOnboarding(): Promise<ActionResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompletedAt: new Date() },
    })

    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return { success: false, error: 'Failed to complete onboarding' }
  }
}

/**
 * Reset the current user's onboarding state so the slideshow appears again.
 * Called from the "Replay intro tour" button on the Help page.
 */
export async function resetOnboarding(): Promise<ActionResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompletedAt: null },
    })

    revalidatePath('/dashboard')
    revalidatePath('/help')

    return { success: true }
  } catch (error) {
    console.error('Error resetting onboarding:', error)
    return { success: false, error: 'Failed to reset onboarding' }
  }
}
