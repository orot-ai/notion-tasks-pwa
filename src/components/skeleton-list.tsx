export function SkeletonList() {
  return (
    <div className="space-y-2 px-3 mt-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 px-4 py-3.5 rounded-2xl"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <div className="h-5 w-5 rounded-full bg-[var(--surface-alt)] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded-md bg-[var(--surface-alt)] animate-pulse" />
            <div className="h-2.5 w-1/3 rounded-md bg-[var(--surface-alt)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
