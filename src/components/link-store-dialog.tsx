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
import { useAppleApps, useGoogleApps } from "@/hooks/use-store-data";

const APPLE_PLATFORMS = [
  { value: "IOS", label: "iOS" },
  { value: "MAC_OS", label: "macOS" },
  { value: "TV_OS", label: "tvOS" },
  { value: "VISION_OS", label: "visionOS" },
] as const;

interface LinkStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: "google" | "apple";
  onLink: (data: { google?: { packageName: string; name: string }; apple?: { appId: string; name: string; bundleId: string; platforms?: string[] } }) => void;
  excludeAppleAppIds?: string[];
  excludeGooglePackageNames?: string[];
}

interface SettingsStatus {
  googleServiceAccountJson: boolean;
  appleIssuerId: boolean;
  appleKeyId: boolean;
  applePrivateKey: boolean;
}

export function LinkStoreDialog({ open, onOpenChange, store, onLink, excludeAppleAppIds = [], excludeGooglePackageNames = [] }: LinkStoreDialogProps) {
  const [packageName, setPackageName] = useState("");
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);
  const [selectedGoogleApp, setSelectedGoogleApp] = useState<{
    packageName: string;
    displayName: string;
  } | null>(null);
  const [selectedAppleApp, setSelectedAppleApp] = useState<{
    appId: string;
    name: string;
    bundleId: string;
  } | null>(null);
  const [applePlatforms, setApplePlatforms] = useState<string[]>(APPLE_PLATFORMS.map((p) => p.value));

  const { data: settings } = useSWR<SettingsStatus>(
    open ? "/api/settings" : null,
    (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
  );
  const googleConfigured = !!settings?.googleServiceAccountJson;
  const { data: googleApps, isLoading: googleLoading, error: googleAppsError } = useGoogleApps(
    store === "google" && googleConfigured
  );
  const appleConfigured = settings?.appleIssuerId && settings?.appleKeyId && settings?.applePrivateKey;
  const { data: appleApps, isLoading: appleLoading, error: appleError } = useAppleApps(
    store === "apple" && !!appleConfigured
  );

  const reset = () => {
    setPackageName("");
    setError("");
    setValidating(false);
    setSelectedGoogleApp(null);
    setSelectedAppleApp(null);
    setApplePlatforms(APPLE_PLATFORMS.map((p) => p.value));
  };

  const handleLinkGoogle = async () => {
    const effectivePackageName = selectedGoogleApp?.packageName || packageName;
    if (!effectivePackageName) return;
    if (!selectedGoogleApp) {
      setValidating(true);
      setError("");
      try {
        const res = await fetch(`/api/google/apps?packageName=${encodeURIComponent(effectivePackageName)}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Invalid package name");
          setValidating(false);
          return;
        }
      } catch {
        setError("Failed to validate");
        setValidating(false);
        return;
      }
      setValidating(false);
    }
    onLink({ google: { packageName: effectivePackageName, name: selectedGoogleApp?.displayName || effectivePackageName } });
    reset();
    onOpenChange(false);
  };

  const handleLinkApple = () => {
    if (!selectedAppleApp) return;
    onLink({
      apple: {
        ...selectedAppleApp,
        ...(applePlatforms.length < APPLE_PLATFORMS.length ? { platforms: applePlatforms } : {}),
      },
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Link {store === "google" ? "Google Play" : "App Store"}
          </DialogTitle>
        </DialogHeader>

        {store === "google" ? (
          <div className="space-y-2 py-2">
            <Label>Google Play App</Label>
            {googleLoading ? (
              <p className="text-sm text-muted-foreground">Loading apps...</p>
            ) : googleApps && googleApps.length > 0 && !googleAppsError ? (
              <div className="grid gap-1 max-h-48 overflow-y-auto overflow-x-hidden">
                {[...googleApps].filter((app) => !excludeGooglePackageNames.includes(app.packageName)).sort((a, b) => (a.displayName || a.packageName).localeCompare(b.displayName || b.packageName)).map((app) => (
                  <button
                    key={app.packageName}
                    type="button"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors min-w-0 ${
                      selectedGoogleApp?.packageName === app.packageName
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      setSelectedGoogleApp(
                        selectedGoogleApp?.packageName === app.packageName ? null : app
                      )
                    }
                  >
                    <img
                      src={`/api/app-icon?store=google&id=${app.packageName}`}
                      alt=""
                      className="h-8 w-8 rounded-lg shrink-0 bg-muted"
                      onError={(e) => { e.currentTarget.style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"; }}
                    />
                    <div style={{ display: "none" }} className="h-8 w-8 rounded-lg shrink-0 bg-muted items-center justify-center text-muted-foreground text-xs">?</div>
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="font-medium truncate">{app.displayName || app.packageName}</span>
                      <span className="text-xs opacity-70 truncate">{app.packageName}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <Input
                  id="link-package"
                  placeholder="com.example.app"
                  value={packageName}
                  onChange={(e) => { setPackageName(e.target.value); setSelectedGoogleApp(null); setError(""); }}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2 py-2">
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
              <div className="grid gap-1 max-h-48 overflow-y-auto overflow-x-hidden">
                {[...appleApps].filter((app) => !excludeAppleAppIds.includes(app.appId)).sort((a, b) => a.name.localeCompare(b.name)).map((app) => (
                  <button
                    key={app.appId}
                    type="button"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors min-w-0 ${
                      selectedAppleApp?.appId === app.appId
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      setSelectedAppleApp(selectedAppleApp?.appId === app.appId ? null : app)
                    }
                  >
                    <img
                      src={`/api/app-icon?store=apple&id=${app.appId}`}
                      alt=""
                      className="h-8 w-8 rounded-lg shrink-0 bg-muted"
                      onError={(e) => { e.currentTarget.style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"; }}
                    />
                    <div style={{ display: "none" }} className="h-8 w-8 rounded-lg shrink-0 bg-muted items-center justify-center text-muted-foreground text-xs">?</div>
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="font-medium truncate">{app.name}</span>
                      <span className="text-xs opacity-70 truncate">{app.bundleId}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No apps found.</p>
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={store === "google" ? handleLinkGoogle : handleLinkApple}
            disabled={store === "google" ? (!selectedGoogleApp && !packageName) || validating : !selectedAppleApp}
          >
            {validating ? "Validating..." : "Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
