const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  const monthIndex = Number(month) - 1;
  const name = months[monthIndex] ?? month;
  return `${Number(day)} ${name}`;
}

function barPath(x: number, y: number, width: number, height: number): string {
  if (height <= 0) return "";
  const radius = Math.min(4, width / 2, height);
  return `M ${x} ${y + radius} Q ${x} ${y} ${x + radius} ${y} H ${x + width - radius} Q ${x + width} ${y} ${x + width} ${y + radius} V ${y + height} H ${x} Z`;
}

/** Single-series bars for a date range. A hidden table carries the same numbers. */
export function DownloadChart({
  points,
  days = 30,
}: {
  points: { date: string; count: number }[];
  days?: number;
}) {
  const max = points.reduce((highest, point) => Math.max(highest, point.count), 0);
  const width = 600;
  const height = 140;
  const gap = 4;
  const barWidth = points.length > 0 ? (width - gap * Math.max(points.length - 1, 0)) / points.length : 0;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <section aria-labelledby="downloads-30">
      <h2 id="downloads-30" className="text-xl leading-7 font-medium">
        Downloads in the last {days} days
      </h2>
      {/* The frame stays even with no data, so nothing jumps when the first download arrives. */}
      <div className="relative mt-6">
        <p className="text-right text-xs leading-4 text-muted-foreground">{max}</p>
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-40 w-full" role="img" aria-hidden="true">
          {[0.25, 0.5, 0.75].map((step) => (
            <line
              key={step}
              x1="0"
              x2={width}
              y1={height * (1 - step)}
              y2={height * (1 - step)}
              stroke="var(--border)"
              strokeWidth="1"
            />
          ))}
          <line x1="0" x2={width} y1={height - 0.5} y2={height - 0.5} stroke="var(--border)" strokeWidth="1" />
          {max === 0 ? null : points.map((point, index) => {
            const barHeight = (point.count / max) * (height - 4);
            const x = index * (barWidth + gap);
            return (
              <path
                key={point.date}
                className="bar-rise"
                style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
                d={barPath(x, height - barHeight, barWidth, barHeight)}
                fill="var(--foreground)"
              />
            );
          })}
        </svg>
        {first && last ? (
          <div className="mt-2 flex justify-between text-xs leading-4 text-muted-foreground">
            <span>{shortDate(first.date)}</span>
            <span>{shortDate(last.date)}</span>
          </div>
        ) : null}
        {max === 0 ? (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm leading-5 text-muted-foreground">
            No downloads yet
          </p>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>Downloads per day for the last {days} days</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Downloads</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
