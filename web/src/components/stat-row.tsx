/** Figures separated by space, not rules. */
export function StatRow({
  items,
}: {
  items: { label: string; value: string; context: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-12 rounded-xl bg-card p-8 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-sm leading-5 text-muted-foreground">{item.label}</p>
          <p className="serif mt-2 text-[40px] leading-[46px] font-light">{item.value}</p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">{item.context}</p>
        </div>
      ))}
    </div>
  );
}
