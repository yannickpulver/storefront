"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { PromoteReleaseDialog } from "@/components/promote-release-dialog";
import { toneText } from "@/components/tone";
import { playConsoleTrackUrl } from "@/lib/google/console";
import { BAD_BEHAVIOUR, formatRate } from "@/lib/google/vitals";
import {
  appStoreConnectUrl,
  rolloutProgress,
  stripVersionCode,
  testFlightExpiry,
} from "@/lib/releases";
import type { AppVersionVitals, NormalizedRelease, VersionVitals } from "@/lib/types";

const TRACK_ORDER = ["internal", "alpha", "beta", "production"] as const;

function compareReleases(a: NormalizedRelease, b: NormalizedRelease): number {
  const pa = a.version.split(".").map(Number);
  const pb = b.version.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  const codeA = parseInt(a.versionCode || "0", 10);
  const codeB = parseInt(b.versionCode || "0", 10);
  return codeA - codeB;
}

function hasPromotableTrack(release: NormalizedRelease, allReleases: NormalizedRelease[]): boolean {
  const srcIdx = TRACK_ORDER.indexOf(release.track as typeof TRACK_ORDER[number]);
  if (srcIdx === -1) return false;
  const byTrack = new Map(allReleases.map((r) => [r.track, r]));
  for (let i = srcIdx + 1; i < TRACK_ORDER.length; i++) {
    const upper = byTrack.get(TRACK_ORDER[i]);
    if (!upper) continue;
    if (compareReleases(release, upper) > 0) return true;
  }
  return false;
}

/**
 * "crashes 0.42 % · freezes 0.10 %": the share of a version's users who saw either, a warning
 * once one passes the bar at which Google Play shows the app less.
 */
function VitalsText({ figures }: { figures: VersionVitals }) {
  const { crashRate, anrRate, days, through } = figures;
  const parts = [
    crashRate !== null && `crashes ${formatRate(crashRate)}`,
    anrRate !== null && `freezes ${formatRate(anrRate)}`,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  const warn = (crashRate ?? 0) > BAD_BEHAVIOUR.crash || (anrRate ?? 0) > BAD_BEHAVIOUR.anr;
  return (
    <span
      className={cn("text-xs", warn ? toneText.amber : "text-muted-foreground")}
      title={`Share of this version's users who saw the app crash or freeze over ${days} ${days === 1 ? "day" : "days"} up to ${formatDate(`${through}T12:00:00Z`)}. Google Play shows an app less prominently above ${formatRate(BAD_BEHAVIOUR.crash)} crashes or ${formatRate(BAD_BEHAVIOUR.anr)} freezes.`}
    >
      {parts.join(" · ")}
    </span>
  );
}

function Hint({ hint }: { hint: { text: string; warn: boolean } | null }) {
  if (!hint) return null;
  return (
    <span className={cn("text-xs", hint.warn ? toneText.amber : "text-muted-foreground")}>
      {hint.text}
    </span>
  );
}

interface ReleaseListProps {
  /** Already filtered to the releases worth showing. */
  releases: NormalizedRelease[];
  packageName?: string;
  appleAppId?: string;
  playConsoleUrl?: string;
  vitals?: AppVersionVitals;
  onReleasesChanged?: () => void;
}

export function ReleaseList({
  releases,
  packageName,
  appleAppId,
  playConsoleUrl,
  vitals,
  onReleasesChanged,
}: ReleaseListProps) {
  const [promoteRelease, setPromoteRelease] = useState<NormalizedRelease | null>(null);

  if (releases.length === 0) {
    return <p className="text-sm text-muted-foreground">No releases</p>;
  }

  return (
    <>
      <div>
        {releases.map((r, i) => {
          const canPromote =
            r.store === "google" &&
            packageName &&
            r.track !== "production" &&
            r.statusCategory !== "draft" &&
            hasPromotableTrack(r, releases);
          const href =
            r.store === "apple"
              ? appleAppId && appStoreConnectUrl(r, appleAppId)
              : playConsoleUrl && playConsoleTrackUrl(playConsoleUrl, r.track);
          const figures = r.versionCode ? vitals?.[r.versionCode] : undefined;
          return (
            <div
              key={`${r.version}-${r.track}-${i}`}
              className="flex items-center justify-between gap-2 -mx-2 px-2 py-1 rounded-md hover:bg-accent/50 transition-colors"
            >
              <a
                href={href || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("flex items-center gap-2 min-w-0 flex-1", !href && "pointer-events-none")}
              >
                <span className="text-sm font-mono font-medium">
                  {stripVersionCode(r.version, r.versionCode)}
                </span>
                {r.versionCode && (
                  <span className="text-xs text-muted-foreground">({r.versionCode})</span>
                )}
                <span className="text-xs text-muted-foreground truncate">{r.track}</span>
              </a>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Hint hint={testFlightExpiry(r)} />
                <Hint hint={rolloutProgress(r)} />
                {figures && <VitalsText figures={figures} />}
                {canPromote && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Promote"
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
          allReleases={releases}
          onSuccess={() => {
            setPromoteRelease(null);
            onReleasesChanged?.();
          }}
        />
      )}
    </>
  );
}
