import { Skeleton } from "@/components/ui/skeleton";
import { bookGridClass } from "@/lib/book-grid-class";

/**
 * Loading screens shown the moment a page change starts. Every reader page reads the session
 * cookie, so it can't be prefetched in full; without these, a click showed nothing until the server answered.
 * They match the real layouts, so the content lands where the placeholders were.
 */
export function GridLoading({ label }: { label: string }) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-3 h-5 w-32" />
      </div>
      <ul className={bookGridClass}>
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index}>
            <Skeleton className="aspect-[2/3] w-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </li>
        ))}
      </ul>
    </main>
  );
}

export function FormLoading({ label }: { label: string }) {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8" aria-busy="true">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-9 w-40" />
      <div className="mt-6 grid max-w-xl gap-6">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}

/** Book page. The cover placeholder is the target of the card-to-cover morph (`data-vt-target`). */
export function BookLoading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-2 pb-6 md:px-8 md:py-8" aria-busy="true">
      <span className="sr-only">Loading book</span>
      <Skeleton className="h-11 w-20" />
      <div className="mt-2 flex flex-col items-start gap-6 md:mt-4 md:flex-row md:gap-12">
        <div className="w-48 shrink-0 md:w-[280px]">
          <div data-vt-target className="aspect-[2/3] w-full rounded-sm bg-border" />
        </div>
        <div className="min-w-0 flex-1">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="mt-3 h-6 w-1/3" />
          <Skeleton className="mt-8 h-24 w-full max-w-[480px]" />
          <Skeleton className="mt-8 h-20 w-full max-w-[640px]" />
        </div>
      </div>
    </main>
  );
}
