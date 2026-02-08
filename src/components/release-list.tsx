"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { PromoteReleaseDialog } from "@/components/promote-release-dialog";
import type { NormalizedRelease } from "@/lib/types";

const TRACK_ORDER = ["internal", "alpha", "beta", "production"] as const;

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function hasPromotableTrack(release: NormalizedRelease, allReleases: NormalizedRelease[]): boolean {
  const srcIdx = TRACK_ORDER.indexOf(release.track as typeof TRACK_ORDER[number]);
  if (srcIdx === -1) return false;
  const byTrack = new Map(allReleases.map((r) => [r.track, r]));
  for (let i = srcIdx + 1; i < TRACK_ORDER.length; i++) {
    const upper = byTrack.get(TRACK_ORDER[i]);
    if (!upper) continue;
    if (compareVersions(release.version, upper.version) > 0) return true;
  }
  return false;
}

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

interface ReleaseListProps {
  releases: NormalizedRelease[];
  packageName?: string;
  onReleasesChanged?: () => void;
}

export function ReleaseList({ releases, packageName, onReleasesChanged }: ReleaseListProps) {
  const [promoteRelease, setPromoteRelease] = useState<NormalizedRelease | null>(null);
  const filtered = filterLatestReleases(releases);

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">No releases</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {filtered.map((r, i) => {
          const canPromote = r.store === "google" && packageName && r.track !== "production" && hasPromotableTrack(r, filtered);
          return (
            <div key={`${r.version}-${r.track}-${i}`} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-mono font-medium">{r.version}</span>
                {r.versionCode && <span className="text-xs text-muted-foreground">({r.versionCode})</span>}
                <span className="text-xs text-muted-foreground truncate">{r.track}</span>
              </div>
              <div className="flex items-center gap-1">
                {canPromote && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setPromoteRelease(r)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                )}
                <StatusBadge status={r.status} category={r.statusCategory} />
              </div>
            </div>
          );
        })}
      </div>

      {promoteRelease && packageName && (
        <PromoteReleaseDialog
          open={!!promoteRelease}
          onOpenChange={(open) => !open && setPromoteRelease(null)}
          release={promoteRelease}
          packageName={packageName}
          allReleases={filtered}
          onSuccess={() => {
            setPromoteRelease(null);
            onReleasesChanged?.();
          }}
        />
      )}
    </>
  );
}
