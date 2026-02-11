'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@/components/ui/dialog'
import { RecordDepositDialog } from './record-deposit-dialog'
import { Button } from '@/components/design-system/button/button'

export function RecordDepositButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setIsModalOpen(false)
    // Refresh the server component to show the updated data
    router.refresh()
  }

  const handleCancel = () => {
    setIsModalOpen(false)
  }

  const PlusIcon = (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="primary"
        leftIcon={PlusIcon}
        aria-label="Record cash deposit"
      >
        Record Deposit
      </Button>

      <Dialog
        isOpen={isModalOpen}
        onClose={handleCancel}
        title="Record Cash Deposit"
        maxWidth="lg"
      >
        <RecordDepositDialog onSuccess={handleSuccess} onCancel={handleCancel} />
      </Dialog>
    </>
  )
}
