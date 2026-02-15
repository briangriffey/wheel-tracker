import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSubscriptionStatus } from '@/lib/actions/billing'
import { getTradeUsage } from '@/lib/actions/subscription'
import { BillingContent } from '@/components/billing/billing-content'

export const metadata = {
  title: 'Billing | Wheel Tracker',
  description: 'Manage your subscription and billing',
}

export default async function BillingPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const [subscriptionResult, usageResult] = await Promise.all([
    getSubscriptionStatus(),
    getTradeUsage(),
  ])

  const subscription = subscriptionResult.success ? subscriptionResult.data : null
  const usage = usageResult.success ? usageResult.data : null

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">Billing</h1>
        <Suspense>
          <BillingContent subscription={subscription} usage={usage} />
        </Suspense>
      </div>
    </div>
  )
}
