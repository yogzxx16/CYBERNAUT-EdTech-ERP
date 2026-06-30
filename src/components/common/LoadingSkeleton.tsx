export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="skeleton-shimmer h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-shimmer h-3 w-1/3 rounded" />
            <div className="skeleton-shimmer h-3 w-2/3 rounded" />
          </div>
          <div className="skeleton-shimmer h-8 w-20 shrink-0 rounded-md" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
