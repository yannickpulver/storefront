import { StatusBadge } from "@/components/status-badge";
import type { NormalizedRelease } from "@/lib/types";

function filterLatestReleases(releases: NormalizedRelease[]): NormalizedRelease[] {
  if (releases.length === 0) return [];

  const store = releases[0].store;

  if (store === "google") {
    // Show newest release per track (production, beta, alpha, internal)
    const byTrack = new Map<string, NormalizedRelease>();
    for (const r of releases) {
      if (r.statusCategory === "draft") continue;
      if (!byTrack.has(r.track)) byTrack.set(r.track, r);
    }
    return Array.from(byTrack.values());
  }

  // Apple: newest live + newest non-live per platform
  const byPlatform = new Map<string, { live: NormalizedRelease | null; nonLive: NormalizedRelease | null }>();

  for (const r of releases) {
    if (r.statusCategory === "draft") continue;
    if (!byPlatform.has(r.track)) byPlatform.set(r.track, { live: null, nonLive: null });
    const entry = byPlatform.get(r.track)!;
    if (r.statusCategory === "live") {
      if (!entry.live) entry.live = r;
    } else {
      if (!entry.nonLive) entry.nonLive = r;
    }
  }

  const platformOrder = ["iOS", "macOS", "tvOS", "visionOS"];
  const sorted = [...byPlatform.entries()].sort(
    (a, b) => (platformOrder.indexOf(a[0]) >>> 0) - (platformOrder.indexOf(b[0]) >>> 0)
  );

  const result: NormalizedRelease[] = [];
  for (const [, { nonLive, live }] of sorted) {
    if (nonLive) result.push(nonLive);
    if (live) result.push(live);
  }
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
