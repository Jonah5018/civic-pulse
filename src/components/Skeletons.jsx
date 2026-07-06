export function TableRowSkeleton({ columns = 6 }) {
  return (
    <tr className="border-b border-border-soft/60">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 w-full max-w-[120px] animate-pulse rounded bg-white/10" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-8 w-16 animate-pulse rounded bg-white/10" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass flex h-64 items-end gap-2 rounded-2xl p-5">
      {[40, 65, 30, 80, 50, 70, 45].map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-md bg-white/10"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
