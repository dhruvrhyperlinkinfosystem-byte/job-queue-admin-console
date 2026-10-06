import { cn } from "../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)}
    />
  );
}

/** Wraps skeleton placeholders so screen readers get one "Loading" announcement. */
export function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Table-shaped placeholder so the layout does not jump when rows arrive. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="h-11 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-slate-100 px-4 py-3.5 last:border-b-0 dark:border-slate-800/70"
        >
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="ml-auto h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
