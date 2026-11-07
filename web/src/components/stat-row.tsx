/** Figures separated by space, not boxes. */
export function StatRow({
  items,
}: {
  items: { label: string; value: string; context: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-x-12 gap-y-8 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-sm leading-5 text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-[32px] leading-10 font-semibold tabular-nums">{item.value}</p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">{item.context}</p>
        </div>
      ))}
    </div>
  );
}
