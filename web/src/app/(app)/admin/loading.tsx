import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-6 md:px-8 md:py-8"
      role="status"
      aria-label="Loading admin"
    >
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-3 h-5 w-80 max-w-full" />
        <div className="mt-6 flex gap-6">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-11 w-16" />
          <Skeleton className="h-11 w-16" />
          <Skeleton className="h-11 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="px-6 py-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-10 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </main>
  );
}
