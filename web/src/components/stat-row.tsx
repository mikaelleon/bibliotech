import { cn } from "@/lib/utils";

/** One panel, four figures, divided by a line. Two by two on a narrow screen. */
export function StatRow({
  items,
}: {
  items: { label: string; value: string; context: string }[];
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "px-6 py-6",
            index % 2 === 1 && "border-l border-border",
            index > 0 && "md:border-l md:border-border",
            index >= 2 && "border-t border-border md:border-t-0",
          )}
        >
          <p className="text-sm leading-5 text-muted-foreground">{item.label}</p>
          <p className="serif mt-2 text-[40px] leading-[46px] font-light">{item.value}</p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">{item.context}</p>
        </div>
      ))}
    </div>
  );
}
