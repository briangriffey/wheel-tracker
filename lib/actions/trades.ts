'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { CreateTradeSchema } from '@/lib/validations/trade'

export async function createTrade(data: z.infer<typeof CreateTradeSchema>) {
  // Get current user session
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized. Please sign in to create trades.',
    }
  }

  // Validate input
  const parsed = CreateTradeSchema.safeParse(data)

  if (!parsed.success) {
    return {
      error: 'Invalid input',
      details: parsed.error.flatten().fieldErrors,
    }
  }

  const { ticker, type, action, strikePrice, premium, contracts, openDate, expirationDate, notes } = parsed.data

  // Calculate shares (contracts * 100)
  const shares = contracts * 100

  try {
    const trade = await prisma.trade.create({
      data: {
        userId: session.user.id,
        ticker,
        type,
        action,
        strikePrice,
        premium,
        contracts,
        shares,
        openDate,
        expirationDate,
        notes,
      },
    })

    // Revalidate pages that display trades
    revalidatePath('/trades')
    revalidatePath('/dashboard')

    return {
      success: true,
      trade,
    }
  } catch (error) {
    console.error('Failed to create trade:', error)
    return {
      error: 'Failed to create trade. Please try again.',
    }
  }
}
