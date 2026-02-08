import { TradeEntryForm } from '@/components/forms/trade-entry-form'

export default function NewTradePage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg px-8 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">Create New Trade</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Enter the details of your options trade
            </p>
          </div>
          <TradeEntryForm />
        </div>
      </div>
    </div>
  )
}
