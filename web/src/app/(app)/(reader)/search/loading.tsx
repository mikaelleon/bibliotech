import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading search results</span>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-4 h-6 w-40" />
      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index}>
            <Skeleton className="aspect-[2/3] w-full" />
          </li>
        ))}
      </ul>
    </main>
  );
}
