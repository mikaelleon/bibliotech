"use client";

import Link from "next/link";
import { useState } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CATEGORIES, type Book } from "@/lib/types";

type Errors = Partial<Record<"title" | "author" | "category" | "description", string>>;

export function BookForm({ book }: { book?: Book }) {
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [category, setCategory] = useState(book?.category ?? "");
  const [description, setDescription] = useState(book?.summary ?? "");
  const [errors, setErrors] = useState<Errors>({});

  function check(field: keyof Errors, value: string) {
    setErrors((current) => ({
      ...current,
      [field]: value.trim() ? undefined : "This field is required.",
    }));
  }

  return (
    <form
      className="grid max-w-[640px] gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        check("title", title);
        check("author", author);
        check("category", category);
        check("description", description);
      }}
    >
      <Field label="Title" name="title" value={title} onChange={setTitle} onBlur={() => check("title", title)} error={errors.title} />
      <Field label="Author" name="author" value={author} onChange={setAuthor} onBlur={() => check("author", author)} error={errors.author} />
      <label className="grid gap-2 text-sm leading-5" htmlFor="category">
        Category
        <Select
          id="category"
          name="category"
          value={category}
          onBlur={() => check("category", category)}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">Choose a category</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        {errors.category ? <span className="text-sm leading-5 text-brand-text">{errors.category}</span> : null}
      </label>
      <label className="grid gap-2 text-sm leading-5" htmlFor="description">
        Description
        <textarea
          id="description"
          name="description"
          value={description}
          onBlur={() => check("description", description)}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-32 rounded-xl border border-border bg-card px-3 py-3 text-base leading-6"
        />
        {errors.description ? <span className="text-sm leading-5 text-brand-text">{errors.description}</span> : null}
      </label>
      <Field label="Cover URL" name="coverUrl" defaultValue={book?.coverUrl ?? ""} />
      <Field label="Source" name="source" defaultValue={book?.sourceName ?? ""} />
      <Field label="License" name="license" defaultValue={book?.license ?? ""} />
      <Field label="Source URL" name="sourceUrl" defaultValue={book?.sourceUrl ?? ""} />
      <Field label="Download URL" name="downloadUrl" defaultValue="" />
      <Field label="Language" name="language" defaultValue={book?.language ?? "English"} />
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/books">Cancel</Link>
        </Button>
        <Button type="submit" disabled>
          Save book
        </Button>
      </div>
      <p className="text-sm leading-5 text-muted-foreground">Saving arrives in Phase 2.</p>
    </form>
  );
}
