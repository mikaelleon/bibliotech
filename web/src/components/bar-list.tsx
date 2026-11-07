/** Horizontal bars sized against the largest count. */
export function BarList({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));

  if (items.length === 0) {
    return <p className="text-sm leading-5 text-muted-foreground">No books in the catalog.</p>;
  }

  return (
    <ul className="grid gap-4">
      {items.map((item, index) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-4 text-sm leading-5">
            <span>{item.label}</span>
            <span className="text-muted-foreground">{item.count}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border" aria-hidden>
            <i
              className="bar-grow block h-full bg-foreground"
              style={{ width: `${(item.count / max) * 100}%`, animationDelay: `${Math.min(index, 12) * 30}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
