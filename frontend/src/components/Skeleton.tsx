"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-lg ${className}`}
    />
  );
}

/** Skeleton layout matching the SchoolPanel loading state */
export function SchoolPanelSkeleton() {
  return (
    <div className="fixed right-0 top-14 bottom-0 w-full sm:w-96 bg-zinc-950/80 backdrop-blur-2xl border-l border-zinc-700/30 z-40 animate-slide-in">
      {/* Header skeleton */}
      <div className="border-b border-zinc-700/30 p-4">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Details skeleton */}
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded-full shrink-0" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded-full shrink-0" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-3 w-1/3" />
        </div>

        {/* Venues skeleton */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3 bg-zinc-900/60 border border-zinc-700/30 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton rows for the ExplorePanel */
export function ExplorePanelSkeleton() {
  return (
    <div className="py-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-3 py-2.5 border-b border-zinc-800/30">
          <Skeleton className="h-4 w-4/5 mb-1.5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for the map loading state */
export function MapLoadingSkeleton() {
  return (
    <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}
