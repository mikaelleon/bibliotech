"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/select";

/** Compact sort control. The first option is the default and stays out of the URL. */
export function CatalogSort({
  value,
  options,
  onValueChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  /** When set, the choice updates the list in place instead of navigating. */
  onValueChange?: (value: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <Select
      aria-label="Sort"
      value={value}
      className="w-full md:w-44"
      onChange={(event) => {
        const next = event.target.value;
        if (onValueChange) {
          onValueChange(next);
          return;
        }
        const search = new URLSearchParams(params.toString());
        if (next === options[0]?.value) search.delete("sort");
        else search.set("sort", next);
        search.delete("page");
        const query = search.toString();
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
