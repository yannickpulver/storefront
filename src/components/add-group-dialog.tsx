"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppleApps } from "@/hooks/use-store-data";
import type { AppGroup } from "@/lib/types";

const APPLE_PLATFORMS = [
  { value: "IOS", label: "iOS" },
  { value: "MAC_OS", label: "macOS" },
  { value: "TV_OS", label: "tvOS" },
  { value: "VISION_OS", label: "visionOS" },
] as const;

interface SettingsStatus {
  appleIssuerId: boolean;
  appleKeyId: boolean;
  applePrivateKey: boolean;
}

export function AddGroupDialog({
  open,
  onOpenChange,
  onAdd,
  linkedAppleAppIds = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (group: AppGroup) => void;
  linkedAppleAppIds?: string[];
}) {
  const [name, setName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [selectedAppleApp, setSelectedAppleApp] = useState<{
    appId: string;
    name: string;
    bundleId: string;
  } | null>(null);
  const [applePlatforms, setApplePlatforms] = useState<string[]>(APPLE_PLATFORMS.map((p) => p.value));
  const [googleError, setGoogleError] = useState("");
  const [validating, setValidating] = useState(false);

  const { data: settings } = useSWR<SettingsStatus>(
    open ? "/api/settings" : null,
    (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
  );
  const appleConfigured = settings?.appleIssuerId && settings?.appleKeyId && settings?.applePrivateKey;
  const { data: appleApps, isLoading: appleLoading, error: appleError } = useAppleApps(!!appleConfigured);

  const reset = () => {
    setName("");
    setPackageName("");
    setSelectedAppleApp(null);
    setApplePlatforms(APPLE_PLATFORMS.map((p) => p.value));
    setGoogleError("");
    setValidating(false);
  };

  const validateGoogle = async () => {
    if (!packageName) return true;
    setValidating(true);
    setGoogleError("");
    try {
      const res = await fetch(
        `/api/google/apps?packageName=${encodeURIComponent(packageName)}`
      );
      if (!res.ok) {
        const data = await res.json();
        setGoogleError(data.error || "Invalid package name");
        setValidating(false);
        return false;
      }
      setValidating(false);
      return true;
    } catch {
      setGoogleError("Failed to validate");
      setValidating(false);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!name) return;
    if (!(await validateGoogle())) return;

    const group: AppGroup = {
      id: crypto.randomUUID(),
      name,
      ...(packageName
        ? { google: { packageName, name: packageName } }
        : {}),
      ...(selectedAppleApp
        ? {
            apple: {
              appId: selectedAppleApp.appId,
              name: selectedAppleApp.name,
              bundleId: selectedAppleApp.bundleId,
              ...(applePlatforms.length < APPLE_PLATFORMS.length ? { platforms: applePlatforms } : {}),
            },
          }
        : {}),
    };

    onAdd(group);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add App Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="My App"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="package-name">
              Google Play Package Name{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="package-name"
              placeholder="com.example.app"
              value={packageName}
              onChange={(e) => {
                setPackageName(e.target.value);
                setGoogleError("");
              }}
            />
            {googleError && (
              <p className="text-sm text-destructive">{googleError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              App Store App{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            {!appleConfigured ? (
              <p className="text-sm text-muted-foreground">
                Not configured. Add Apple keys in Settings.
              </p>
            ) : appleLoading ? (
              <p className="text-sm text-muted-foreground">Loading apps...</p>
            ) : appleError ? (
              <p className="text-sm text-destructive">
                {appleError?.error || "Failed to load apps. Check your Apple keys."}
              </p>
            ) : appleApps && appleApps.length > 0 ? (
              <div className="grid gap-1 max-h-48 overflow-y-auto">
                {appleApps.filter((app) => !linkedAppleAppIds.includes(app.appId)).map((app) => (
                  <button
                    key={app.appId}
                    type="button"
                    className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedAppleApp?.appId === app.appId
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      setSelectedAppleApp(
                        selectedAppleApp?.appId === app.appId ? null : app
                      )
                    }
                  >
                    <span className="font-medium">{app.name}</span>
                    <span className="text-xs ml-2 opacity-70">{app.bundleId}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No Apple apps available. Check API credentials.
              </p>
            )}
            {selectedAppleApp && (
              <div className="space-y-2 pt-2">
                <Label className="text-xs">Platforms</Label>
                <div className="flex flex-wrap gap-3">
                  {APPLE_PLATFORMS.map((p) => (
                    <label key={p.value} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={applePlatforms.includes(p.value)}
                        onCheckedChange={(checked) =>
                          setApplePlatforms((prev) =>
                            checked
                              ? [...prev, p.value]
                              : prev.filter((v) => v !== p.value)
                          )
                        }
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || (!packageName && !selectedAppleApp) || validating}
          >
            {validating ? "Validating..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
