import { SkeletonCard } from '@/components/ui/skeleton'

export default function PositionsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="h-8 w-32 bg-neutral-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-neutral-200 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
