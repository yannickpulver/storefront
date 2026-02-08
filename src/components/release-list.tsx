import { StatusBadge } from "@/components/status-badge";
import type { NormalizedRelease } from "@/lib/types";

function filterLatestReleases(releases: NormalizedRelease[]): NormalizedRelease[] {
  let newestLive: NormalizedRelease | null = null;
  let newestNonLive: NormalizedRelease | null = null;

  for (const r of releases) {
    if (r.statusCategory === "live") {
      if (!newestLive) newestLive = r;
    } else if (r.statusCategory !== "draft") {
      if (!newestNonLive) newestNonLive = r;
    }
  }

  const result: NormalizedRelease[] = [];
  if (newestNonLive) result.push(newestNonLive);
  if (newestLive) result.push(newestLive);
  return result;
}

export function ReleaseList({ releases }: { releases: NormalizedRelease[] }) {
  const filtered = filterLatestReleases(releases);

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">No releases</p>;
  }

  return (
    <div className="space-y-2">
      {filtered.map((r, i) => (
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
