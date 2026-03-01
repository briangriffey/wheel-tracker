'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import {
  CreateWheelSchema,
  UpdateWheelSchema,
  WheelFiltersSchema,
  type CreateWheelInput,
  type UpdateWheelInput,
  type WheelFilters,
} from '@/lib/validations/wheel'
import { Prisma } from '@/lib/generated/prisma'

/**
 * Server action result type
 */
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * Create a new wheel for a ticker
 *
 * Initializes a new wheel strategy cycle for tracking PUT/CALL rotations
 * on a specific ticker. Only one ACTIVE wheel per ticker is recommended.
 *
 * @param input - Wheel creation data (ticker, optional notes)
 * @returns Promise resolving to the created wheel
 *
 * @example
 * await createWheel({ ticker: 'AAPL', notes: 'Starting wheel at $150' });
 */
export async function createWheel(
  input: CreateWheelInput
): Promise<ActionResult<{ id: string; ticker: string }>> {
  try {
    // Validate input
    const validated = CreateWheelSchema.parse(input)
    const { ticker, notes } = validated

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Check if user already has an ACTIVE wheel for this ticker
    const existingActiveWheel = await prisma.wheel.findFirst({
      where: {
        userId,
        ticker,
        status: 'ACTIVE',
      },
    })

    if (existingActiveWheel) {
      return {
        success: false,
        error: `An active wheel already exists for ${ticker}. Please pause or complete it before starting a new one.`,
      }
    }

    // Create wheel
    const wheel = await prisma.wheel.create({
      data: {
        userId,
        ticker,
        notes,
        status: 'ACTIVE',
      },
    })

    // Revalidate relevant paths
    revalidatePath('/wheels')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        id: wheel.id,
        ticker: wheel.ticker,
      },
    }
  } catch (error) {
    console.error('Error creating wheel:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to create wheel' }
  }
}

/**
 * Get all wheels for the current user with optional filters
 *
 * @param filters - Optional filters for ticker and status
 * @returns Promise resolving to array of wheels
 *
 * @example
 * await getWheels({ status: 'ACTIVE' });
 * await getWheels({ ticker: 'AAPL' });
 */
export async function getWheels(filters?: WheelFilters): Promise<
  ActionResult<
    Array<{
      id: string
      ticker: string
      status: string
      cycleCount: number
      totalPremiums: number
      totalRealizedPL: number
      startedAt: Date
      lastActivityAt: Date
      completedAt: Date | null
      notes: string | null
      tradeCount: number
      positionCount: number
      deployedCapital: number
    }>
  >
> {
  try {
    // Validate filters
    const validated = WheelFiltersSchema.parse(filters)

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Build where clause
    const where: Prisma.WheelWhereInput = { userId }
    if (validated?.ticker) {
      where.ticker = validated.ticker
    }
    if (validated?.status) {
      where.status = validated.status
    }

    const wheels = await prisma.wheel.findMany({
      where,
      orderBy: [{ status: 'asc' }, { lastActivityAt: 'desc' }],
      select: {
        id: true,
        ticker: true,
        status: true,
        cycleCount: true,
        totalPremiums: true,
        totalRealizedPL: true,
        startedAt: true,
        lastActivityAt: true,
        completedAt: true,
        notes: true,
        trades: {
          where: { status: 'OPEN', type: 'PUT' },
          select: {
            strikePrice: true,
            shares: true,
          },
        },
        positions: {
          where: { status: 'OPEN' },
          select: {
            totalCost: true,
          },
        },
        _count: {
          select: {
            trades: true,
            positions: true,
          },
        },
      },
    })

    // Convert Decimal to number, compute deployedCapital, and flatten _count
    const serialized = wheels.map((wheel: (typeof wheels)[number]) => {
      const openPutCapital = wheel.trades.reduce(
        (sum, t) => sum + t.strikePrice.toNumber() * t.shares,
        0
      )
      const openPositionCapital = wheel.positions.reduce(
        (sum, p) => sum + p.totalCost.toNumber(),
        0
      )

      return {
        id: wheel.id,
        ticker: wheel.ticker,
        status: wheel.status,
        cycleCount: wheel.cycleCount,
        totalPremiums: Number(wheel.totalPremiums),
        totalRealizedPL: Number(wheel.totalRealizedPL),
        startedAt: wheel.startedAt,
        lastActivityAt: wheel.lastActivityAt,
        completedAt: wheel.completedAt,
        notes: wheel.notes,
        deployedCapital: openPutCapital + openPositionCapital,
        tradeCount: wheel._count.trades,
        positionCount: wheel._count.positions,
      }
    })

    return { success: true, data: serialized }
  } catch (error) {
    console.error('Error fetching wheels:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch wheels' }
  }
}

/**
 * Get detailed wheel information including all related trades and positions
 *
 * @param wheelId - The wheel ID to fetch
 * @returns Promise resolving to wheel with full details
 *
 * @example
 * await getWheelDetail('wheel_123');
 */
export async function getWheelDetail(wheelId: string): Promise<
  ActionResult<{
    id: string
    ticker: string
    status: string
    cycleCount: number
    totalPremiums: number
    totalRealizedPL: number
    startedAt: Date
    lastActivityAt: Date
    completedAt: Date | null
    notes: string | null
    deployedCapital: number
    trades: Array<{
      id: string
      type: string
      action: string
      status: string
      strikePrice: number
      premium: number
      contracts: number
      shares: number
      expirationDate: Date
      openDate: Date
      closeDate: Date | null
    }>
    positions: Array<{
      id: string
      shares: number
      costBasis: number
      totalCost: number
      status: string
      realizedGainLoss: number | null
      acquiredDate: Date
      closedDate: Date | null
    }>
  }>
> {
  try {
    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      select: {
        id: true,
        userId: true,
        ticker: true,
        status: true,
        cycleCount: true,
        totalPremiums: true,
        totalRealizedPL: true,
        startedAt: true,
        lastActivityAt: true,
        completedAt: true,
        notes: true,
        trades: {
          select: {
            id: true,
            type: true,
            action: true,
            status: true,
            strikePrice: true,
            premium: true,
            contracts: true,
            shares: true,
            expirationDate: true,
            openDate: true,
            closeDate: true,
          },
          orderBy: { openDate: 'desc' },
        },
        positions: {
          select: {
            id: true,
            shares: true,
            costBasis: true,
            totalCost: true,
            status: true,
            realizedGainLoss: true,
            acquiredDate: true,
            closedDate: true,
          },
          orderBy: { acquiredDate: 'desc' },
        },
      },
    })

    if (!wheel) {
      return { success: false, error: 'Wheel not found' }
    }

    if (wheel.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Calculate per-wheel deployed capital
    const wheelOpenPutCapital = wheel.trades
      .filter((t) => t.status === 'OPEN' && t.type === 'PUT')
      .reduce((sum, t) => sum + t.strikePrice.toNumber() * t.shares, 0)

    const wheelOpenPositionCapital = wheel.positions
      .filter((p) => p.status === 'OPEN')
      .reduce((sum, p) => sum + p.totalCost.toNumber(), 0)

    const wheelDeployedCapital = wheelOpenPutCapital + wheelOpenPositionCapital

    // Convert Decimals to numbers
    const serialized = {
      id: wheel.id,
      ticker: wheel.ticker,
      status: wheel.status,
      cycleCount: wheel.cycleCount,
      totalPremiums: Number(wheel.totalPremiums),
      totalRealizedPL: Number(wheel.totalRealizedPL),
      startedAt: wheel.startedAt,
      lastActivityAt: wheel.lastActivityAt,
      completedAt: wheel.completedAt,
      notes: wheel.notes,
      deployedCapital: wheelDeployedCapital,
      trades: wheel.trades.map((trade: (typeof wheel.trades)[number]) => ({
        id: trade.id,
        type: trade.type,
        action: trade.action,
        status: trade.status,
        strikePrice: Number(trade.strikePrice),
        premium: Number(trade.premium),
        contracts: trade.contracts,
        shares: trade.shares,
        expirationDate: trade.expirationDate,
        openDate: trade.openDate,
        closeDate: trade.closeDate,
      })),
      positions: wheel.positions.map((position: (typeof wheel.positions)[number]) => ({
        id: position.id,
        shares: position.shares,
        costBasis: Number(position.costBasis),
        totalCost: Number(position.totalCost),
        status: position.status,
        realizedGainLoss: position.realizedGainLoss ? Number(position.realizedGainLoss) : null,
        acquiredDate: position.acquiredDate,
        closedDate: position.closedDate,
      })),
    }

    return { success: true, data: serialized }
  } catch (error) {
    console.error('Error fetching wheel detail:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch wheel detail' }
  }
}

/**
 * Update a wheel's editable fields (currently only notes)
 *
 * @param input - Wheel ID and fields to update
 * @returns Promise resolving to updated wheel ID
 *
 * @example
 * await updateWheel({ id: 'wheel_123', notes: 'Updated strategy notes' });
 */
export async function updateWheel(input: UpdateWheelInput): Promise<ActionResult<{ id: string }>> {
  try {
    // Validate input
    const validated = UpdateWheelSchema.parse(input)
    const { id, notes } = validated

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Verify wheel exists and belongs to user
    const existingWheel = await prisma.wheel.findUnique({
      where: { id },
      select: { userId: true, status: true },
    })

    if (!existingWheel) {
      return { success: false, error: 'Wheel not found' }
    }

    if (existingWheel.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Prepare update data
    const updateData: Prisma.WheelUpdateInput = {}
    if (notes !== undefined) updateData.notes = notes

    // Update wheel
    await prisma.wheel.update({
      where: { id },
      data: updateData,
    })

    // Revalidate relevant paths
    revalidatePath('/wheels')
    revalidatePath(`/wheels/${id}`)
    revalidatePath('/dashboard')

    return { success: true, data: { id } }
  } catch (error) {
    console.error('Error updating wheel:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to update wheel' }
  }
}

/**
 * Pause an active wheel
 *
 * Changes wheel status from ACTIVE to PAUSED. Useful when temporarily
 * stopping wheel strategy on a ticker without completing it permanently.
 *
 * @param wheelId - The wheel ID to pause
 * @returns Promise resolving to success/failure
 *
 * @example
 * await pauseWheel('wheel_123');
 */
export async function pauseWheel(wheelId: string): Promise<ActionResult<void>> {
  try {
    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Verify wheel exists and belongs to user
    const existingWheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      select: { userId: true, status: true, ticker: true },
    })

    if (!existingWheel) {
      return { success: false, error: 'Wheel not found' }
    }

    if (existingWheel.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (existingWheel.status !== 'ACTIVE') {
      return {
        success: false,
        error: `Cannot pause ${existingWheel.status.toLowerCase()} wheel. Only ACTIVE wheels can be paused.`,
      }
    }

    // Update wheel status to PAUSED
    await prisma.wheel.update({
      where: { id: wheelId },
      data: {
        status: 'PAUSED',
        lastActivityAt: new Date(),
      },
    })

    // Revalidate relevant paths
    revalidatePath('/wheels')
    revalidatePath(`/wheels/${wheelId}`)
    revalidatePath('/dashboard')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Error pausing wheel:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to pause wheel' }
  }
}

/**
 * Complete a wheel permanently
 *
 * Changes wheel status to COMPLETED and sets completedAt timestamp.
 * This is a permanent action indicating the wheel strategy has ended
 * for this ticker.
 *
 * @param wheelId - The wheel ID to complete
 * @returns Promise resolving to success/failure
 *
 * @example
 * await completeWheel('wheel_123');
 */
export async function completeWheel(wheelId: string): Promise<ActionResult<void>> {
  try {
    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Verify wheel exists and belongs to user
    const existingWheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      select: { userId: true, status: true, ticker: true },
    })

    if (!existingWheel) {
      return { success: false, error: 'Wheel not found' }
    }

    if (existingWheel.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (existingWheel.status === 'COMPLETED') {
      return {
        success: false,
        error: 'Wheel is already completed.',
      }
    }

    // Update wheel status to COMPLETED
    await prisma.wheel.update({
      where: { id: wheelId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        lastActivityAt: new Date(),
      },
    })

    // Revalidate relevant paths
    revalidatePath('/wheels')
    revalidatePath(`/wheels/${wheelId}`)
    revalidatePath('/dashboard')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Error completing wheel:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to complete wheel' }
  }
}
