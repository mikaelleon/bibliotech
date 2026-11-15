"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { BookCover } from "@/components/book-cover";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { saveBook } from "@/lib/admin-actions";
import { CATEGORIES, type Book } from "@/lib/types";

type Errors = Partial<Record<"title" | "author" | "category" | "license" | "coverUrl" | "sourceUrl", string>>;

function required(value: string): string | undefined {
  return value.trim() ? undefined : "This field is required.";
}

function urlError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return undefined;
  return "Enter a URL that starts with http:// or https://.";
}

export function BookForm({ book }: { book?: Book }) {
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [category, setCategory] = useState(book?.category ?? "");
  const [description, setDescription] = useState(book?.summary ?? "");
  const [coverUrl, setCoverUrl] = useState(book?.coverUrl ?? "");
  const [source, setSource] = useState(book?.sourceName ?? "");
  const [license, setLicense] = useState(book?.license ?? "");
  const [sourceUrl, setSourceUrl] = useState(book?.sourceUrl ?? "");
  const [language, setLanguage] = useState(book?.language ?? "English");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    const next: Errors = {
      title: required(title),
      author: required(author),
      category: required(category),
      license: required(license),
      coverUrl: urlError(coverUrl),
      sourceUrl: urlError(sourceUrl),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFormError(null);
    startTransition(async () => {
      const result = await saveBook({
        slug: book?.id,
        title,
        author,
        category,
        language,
        license,
        sourceName: source,
        sourceUrl,
        summary: description,
        coverUrl,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.push("/admin/books");
      router.refresh();
    });
  }

  function setError(field: keyof Errors, message: string | undefined) {
    setErrors((current) => ({ ...current, [field]: message }));
  }

  return (
    <form
      className="grid max-w-[640px] gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {book ? (
        <div className="w-24">
          <BookCover book={book} />
        </div>
      ) : null}
      <Field
        label="Title"
        name="title"
        value={title}
        onChange={setTitle}
        onBlur={(event) => setError("title", required(event.currentTarget.value))}
        error={errors.title}
      />
      <Field
        label="Author"
        name="author"
        value={author}
        onChange={setAuthor}
        onBlur={(event) => setError("author", required(event.currentTarget.value))}
        error={errors.author}
      />
      <label className="grid gap-2 text-sm leading-5" htmlFor="category">
        Category
        <Select
          id="category"
          name="category"
          value={category}
          onBlur={(event) => setError("category", required(event.currentTarget.value))}
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
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-32 rounded-xl border border-border bg-card px-3 py-3 text-base leading-6"
        />
      </label>
      <Field
        label="Cover URL"
        name="coverUrl"
        value={coverUrl}
        onChange={setCoverUrl}
        onBlur={(event) => setError("coverUrl", urlError(event.currentTarget.value))}
        error={errors.coverUrl}
      />
      <Field label="Source" name="source" value={source} onChange={setSource} />
      <Field
        label="License"
        name="license"
        value={license}
        onChange={setLicense}
        onBlur={(event) => setError("license", required(event.currentTarget.value))}
        error={errors.license}
      />
      <Field
        label="Source URL"
        name="sourceUrl"
        value={sourceUrl}
        onChange={setSourceUrl}
        onBlur={(event) => setError("sourceUrl", urlError(event.currentTarget.value))}
        error={errors.sourceUrl}
      />
      <Field label="Language" name="language" value={language} onChange={setLanguage} />
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/books">Back to books</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
      </div>
      {formError ? (
        <p role="alert" className="text-sm leading-5 text-brand-text">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
