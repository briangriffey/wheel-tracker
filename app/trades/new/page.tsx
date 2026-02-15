import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TradeEntryForm } from '@/components/forms/trade-entry-form'

export default async function NewTradePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg px-8 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Create New Trade</h1>
            <p className="mt-1 text-sm text-gray-600">
              Enter the details of your options trade
            </p>
          </div>
          <TradeEntryForm />
        </div>
      </div>
    </div>
  )
}
