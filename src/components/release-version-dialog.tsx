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
import { Button } from "@/components/ui/button";
import { stripVersionCode } from "@/lib/releases";
import type { NormalizedRelease } from "@/lib/types";

/** Confirms publishing an App Store version that waits for the developer's release. */
export function ReleaseVersionDialog({
  release,
  onOpenChange,
  onSuccess,
}: {
  release: NormalizedRelease;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const version = stripVersionCode(release.version, release.versionCode);

  async function handleRelease() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/apple/releases/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: release.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to release");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to release");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Release {version}</DialogTitle>
          <DialogDescription>
            {release.track} {version} goes live on the App Store. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRelease} disabled={loading}>
            {loading ? "Releasing…" : "Release"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
