import { SkeletonTable } from '@/components/ui/skeleton'

export default function TradesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div className="h-8 w-32 bg-neutral-200 rounded animate-pulse" />
        <div className="h-10 w-32 bg-neutral-200 rounded animate-pulse" />
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <SkeletonTable rows={8} />
      </div>
    </div>
  )
}
