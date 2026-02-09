'use client'

import Link from 'next/link'

interface Trade {
  id: string
  type: string
  action: string
  status: string
  strikePrice: number
  premium: number
  contracts: number
  expirationDate: Date
  openDate: Date
  closeDate: Date | null
}

interface Position {
  id: string
  shares: number
  costBasis: number
  totalCost: number
  status: string
  realizedGainLoss: number | null
  acquiredDate: Date
  closedDate: Date | null
}

interface WheelCurrentStatusProps {
  wheel: {
    id: string
    ticker: string
    status: string
  }
  currentTrades: Trade[]
  currentPosition?: Position
}

function determineCurrentStep(
  status: string,
  currentTrades: Trade[],
  currentPosition?: Position
): {
  step: number
  title: string
  description: string
  color: string
} {
  if (status === 'IDLE') {
    return {
      step: 0,
      title: 'Idle - Ready to Start',
      description: 'Cycle complete. Start a new wheel by selling a PUT option.',
      color: 'gray',
    }
  }

  if (status === 'PAUSED') {
    return {
      step: 0,
      title: 'Paused',
      description: 'Wheel strategy is paused. Resume to continue trading.',
      color: 'yellow',
    }
  }

  if (status === 'COMPLETED') {
    return {
      step: 0,
      title: 'Completed',
      description: 'Wheel strategy has ended for this ticker.',
      color: 'gray',
    }
  }

  // ACTIVE status - determine step based on trades/positions
  const hasOpenPut = currentTrades.some((t) => t.type === 'PUT' && t.status === 'OPEN')
  const hasOpenCall = currentTrades.some((t) => t.type === 'CALL' && t.status === 'OPEN')

  if (currentPosition) {
    if (hasOpenCall) {
      return {
        step: 3,
        title: 'Step 3: Covered Position',
        description: 'Holding shares with active covered CALL. Waiting for expiration or assignment.',
        color: 'blue',
      }
    } else {
      return {
        step: 2,
        title: 'Step 2: Holding Position',
        description: 'Holding shares without covered CALL. Ready to sell covered CALL.',
        color: 'purple',
      }
    }
  }

  if (hasOpenPut) {
    return {
      step: 1,
      title: 'Step 1: Collecting PUT Premium',
      description: 'Active PUT option. Waiting for expiration or assignment.',
      color: 'green',
    }
  }

  return {
    step: 0,
    title: 'No Active Trades',
    description: 'Start by selling a PUT option to begin the wheel cycle.',
    color: 'gray',
  }
}

export function WheelCurrentStatus({
  wheel,
  currentTrades,
  currentPosition,
}: WheelCurrentStatusProps) {
  const currentStep = determineCurrentStep(wheel.status, currentTrades, currentPosition)

  const getStepColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-50 border-green-200'
      case 'purple':
        return 'bg-purple-50 border-purple-200'
      case 'blue':
        return 'bg-blue-50 border-blue-200'
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getBadgeColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800'
      case 'purple':
        return 'bg-purple-100 text-purple-800'
      case 'blue':
        return 'bg-blue-100 text-blue-800'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`border rounded-lg p-4 sm:p-6 ${getStepColor(currentStep.color)}`}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getBadgeColor(
                currentStep.color
              )}`}
            >
              {currentStep.title}
            </span>
          </div>
          <p className="mt-3 text-sm sm:text-base text-gray-700">{currentStep.description}</p>

          {/* Wheel Cycle Visual */}
          <div className="mt-4 flex items-center gap-1 sm:gap-2">
            {/* Step 1: PUT */}
            <div
              className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ${
                currentStep.step === 1
                  ? 'bg-green-500 border-green-600 text-white'
                  : currentStep.step > 1
                  ? 'bg-green-100 border-green-300 text-green-700'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              <span className="text-xs sm:text-sm font-bold">1</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300"></div>

            {/* Step 2: Position */}
            <div
              className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ${
                currentStep.step === 2
                  ? 'bg-purple-500 border-purple-600 text-white'
                  : currentStep.step > 2
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              <span className="text-xs sm:text-sm font-bold">2</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300"></div>

            {/* Step 3: CALL */}
            <div
              className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ${
                currentStep.step === 3
                  ? 'bg-blue-500 border-blue-600 text-white'
                  : currentStep.step > 3
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              <span className="text-xs sm:text-sm font-bold">3</span>
            </div>
          </div>

          <div className="mt-2 flex gap-1 sm:gap-4 text-xs text-gray-600">
            <span className="w-10 sm:w-12 text-center">PUT</span>
            <span className="flex-1"></span>
            <span className="w-10 sm:w-12 text-center">Position</span>
            <span className="flex-1"></span>
            <span className="w-10 sm:w-12 text-center">CALL</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:ml-6 flex flex-col gap-2">
          {wheel.status === 'ACTIVE' && (
            <>
              {currentStep.step === 1 && (
                <Link
                  href={`/trades`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Manage PUT
                </Link>
              )}

              {currentStep.step === 2 && (
                <Link
                  href={`/trades/new?ticker=${wheel.ticker}&type=CALL&wheelId=${wheel.id}`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sell Covered CALL
                </Link>
              )}

              {currentStep.step === 3 && (
                <Link
                  href={`/trades`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Manage CALL
                </Link>
              )}

              {currentStep.step === 0 && (
                <Link
                  href={`/trades/new?ticker=${wheel.ticker}&type=PUT&wheelId=${wheel.id}`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Sell PUT
                </Link>
              )}
            </>
          )}

          {wheel.status === 'IDLE' && (
            <Link
              href={`/trades/new?ticker=${wheel.ticker}&type=PUT&wheelId=${wheel.id}`}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Start New PUT
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
