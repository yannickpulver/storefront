"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { NormalizedRelease } from "@/lib/types";

const TRACK_ORDER = ["internal", "alpha", "beta", "production"] as const;

function getUpperTracks(current: string): string[] {
  const idx = TRACK_ORDER.indexOf(current as typeof TRACK_ORDER[number]);
  if (idx === -1) return [];
  return TRACK_ORDER.slice(idx + 1) as unknown as string[];
}

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

interface PromoteReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: NormalizedRelease;
  packageName: string;
  allReleases: NormalizedRelease[];
  onSuccess: () => void;
}

export function PromoteReleaseDialog({
  open,
  onOpenChange,
  release,
  packageName,
  allReleases,
  onSuccess,
}: PromoteReleaseDialogProps) {
  const byTrack = new Map(allReleases.map((r) => [r.track, r]));
  const upperTracks = getUpperTracks(release.track).filter((t) => {
    const existing = byTrack.get(t);
    return !existing || compareReleases(release, existing) > 0;
  });
  const [destTrack, setDestTrack] = useState(upperTracks[0] ?? "");
  const [rollout, setRollout] = useState("100");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rolloutNum = parseInt(rollout, 10);
  const valid = destTrack && rolloutNum >= 1 && rolloutNum <= 100;

  async function handlePromote() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/google/releases/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageName,
          sourceTrack: release.track,
          destTrack,
          rollout: rolloutNum,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to promote");
      }
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Promote Release</DialogTitle>
          <DialogDescription>
            Promote <span className="font-mono font-medium">{release.version}</span> from{" "}
            <span className="font-medium">{release.track}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Target Track</Label>
            <Select value={destTrack} onValueChange={setDestTrack}>
              <SelectTrigger>
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {upperTracks.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rollout %</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={rollout}
              onChange={(e) => setRollout(e.target.value)}
            />
          </div>

          {valid && (
            <p className="text-sm text-muted-foreground">
              Promote <span className="font-mono">{release.version}</span> from {release.track} →{" "}
              {destTrack} at {rolloutNum}%
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePromote} disabled={!valid || loading}>
            {loading ? "Promoting..." : "Promote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
