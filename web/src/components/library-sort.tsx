"use client";

import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/select";

const options = [
  { value: "added", label: "Recently added" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
];

export function LibrarySort({ value }: { value: string }) {
  const router = useRouter();

  return (
    <label className="grid gap-2 text-sm leading-5">
      <span className="text-muted-foreground">Sort</span>
      <Select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          router.push(next === "added" ? "/library" : `/library?sort=${next}`);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
