'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { resetOnboarding } from '@/lib/actions/onboarding'

export function ReplayTourButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleReplay = async () => {
    setLoading(true)
    const result = await resetOnboarding()

    if (result.success) {
      toast.success('Intro tour reset! Redirecting to dashboard...')
      router.push('/dashboard')
    } else {
      toast.error(result.error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReplay}
      disabled={loading}
      className="text-blue-600 hover:underline text-sm font-medium disabled:opacity-50"
    >
      {loading ? 'Resetting...' : 'Replay Intro Tour'}
    </button>
  )
}
