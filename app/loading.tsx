import { Spinner } from '@/components/ui/spinner'

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600">Loading GreekWheel...</p>
      </div>
    </div>
  )
}
