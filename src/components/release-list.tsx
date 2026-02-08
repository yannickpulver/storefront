import { StatusBadge } from "@/components/status-badge";
import type { NormalizedRelease } from "@/lib/types";

export function ReleaseList({ releases }: { releases: NormalizedRelease[] }) {
  if (releases.length === 0) {
    return <p className="text-sm text-muted-foreground">No releases</p>;
  }

  return (
    <div className="space-y-2">
      {releases.map((r, i) => (
        <div key={`${r.version}-${r.track}-${i}`} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-mono font-medium">{r.version}</span>
            <span className="text-xs text-muted-foreground truncate">{r.track}</span>
          </div>
          <StatusBadge status={r.status} category={r.statusCategory} />
        </div>
      ))}
    </div>
  );
}
