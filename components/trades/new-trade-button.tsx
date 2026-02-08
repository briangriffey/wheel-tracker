'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@/components/ui/dialog'
import { TradeEntryForm } from '@/components/forms/trade-entry-form'

export function NewTradeButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setIsModalOpen(false)
    // Refresh the server component to show the new trade
    router.refresh()
  }

  const handleCancel = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        aria-label="Create new trade"
      >
        <svg
          className="-ml-1 mr-2 h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Trade
      </button>

      <Dialog
        isOpen={isModalOpen}
        onClose={handleCancel}
        title="Create New Trade"
        maxWidth="3xl"
      >
        <TradeEntryForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </Dialog>
    </>
  )
}
