import { cn } from '../../lib/utils'

/**
 * A skeleton placeholder that reserves the exact height of a KpiCard so the
 * layout does not shift when real data arrives.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl p-5 shadow-sm border border-app-border border-t-4 border-t-app-border',
        className,
      )}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
          <div className="h-7 w-32 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse shrink-0" />
      </div>
      <div className="mt-3 h-4 w-20 rounded bg-gray-100 animate-pulse" />
    </div>
  )
}

/** Render `count` SkeletonCards — used to reserve KPI grid height during load. */
export function SkeletonCardGrid({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  )
}
