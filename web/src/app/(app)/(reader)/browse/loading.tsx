import { CategoryFilter } from "@/components/category-filter";
import { Skeleton } from "@/components/ui/skeleton";

export default function BrowseLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8"
      role="status"
      aria-label="Loading books"
    >
      <section className="rounded-xl bg-card p-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/3" />
        <Skeleton className="mt-6 h-11 w-48 rounded-full" />
        <div className="mt-8 flex gap-6">
          <Skeleton className="w-48 aspect-[2/3]" />
          <Skeleton className="hidden w-32 aspect-[2/3] md:block" />
          <Skeleton className="hidden w-32 aspect-[2/3] md:block" />
          <Skeleton className="hidden w-32 aspect-[2/3] md:block" />
        </div>
      </section>
      <CategoryFilter />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:gap-x-6 md:gap-y-8">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index}>
            <Skeleton className="aspect-[2/3]" />
            <Skeleton className="mt-3 h-4" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </main>
  );
}
