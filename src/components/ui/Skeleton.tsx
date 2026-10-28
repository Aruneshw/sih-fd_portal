import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded bg-slate-200', className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6" role="status" aria-label="Loading">
      <Skeleton className="h-7 w-64" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
