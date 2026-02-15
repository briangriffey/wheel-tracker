'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@/components/ui/dialog'
import { TradeEntryForm } from '@/components/forms/trade-entry-form'
import { Button } from '@/components/design-system/button/button'

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

  const PlusIcon = (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="primary"
        leftIcon={PlusIcon}
        aria-label="Create new trade"
      >
        New Trade
      </Button>

      <Dialog isOpen={isModalOpen} onClose={handleCancel} title="Create New Trade" maxWidth="3xl">
        <TradeEntryForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </Dialog>
    </>
  )
}
