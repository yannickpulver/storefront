"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GoogleStoreEntry, AppleStoreEntry } from "@/components/app-store-entry";
import { LinkStoreDialog } from "@/components/link-store-dialog";
import type { AppGroup } from "@/lib/types";
import { ChevronDown, ChevronUp, ExternalLink, Plus, SlidersHorizontal } from "lucide-react";

const APPLE_PLATFORMS = [
  { value: "IOS", label: "iOS" },
  { value: "MAC_OS", label: "macOS" },
  { value: "TV_OS", label: "tvOS" },
  { value: "VISION_OS", label: "visionOS" },
] as const;

export function AppGroupCard({
  group,
  onRemove,
  onUpdate,
  onMoveUp,
  onMoveDown,
  linkedAppleAppIds,
}: {
  group: AppGroup;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<AppGroup>) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  linkedAppleAppIds: string[];
}) {
  const [linkStore, setLinkStore] = useState<"google" | "apple" | null>(null);
  const hasBoth = !!group.google && !!group.apple;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            {(group.google || group.apple) && (
              <img
                src={`/api/app-icon?store=${group.google ? "google" : "apple"}&id=${group.google?.packageName || group.apple?.appId}`}
                alt=""
                className="h-8 w-8 rounded-lg"
              />
            )}
            <CardTitle className="text-lg">{group.name}</CardTitle>
          </div>
          <div className="flex items-center gap-0.5">
            {onMoveUp && (
              <Button variant="ghost" size="sm" className="text-muted-foreground h-8 w-8 p-0" onClick={onMoveUp}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && (
              <Button variant="ghost" size="sm" className="text-muted-foreground h-8 w-8 p-0" onClick={onMoveDown}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
              onClick={() => onRemove(group.id)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hasBoth ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-5 rounded bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-xs">G</span>
                  </div>
                  <span className="text-sm font-medium">Google Play</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                    <a href={`https://play.google.com/store/apps/details?id=${group.google!.packageName}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  </Button>
                </div>
                <GoogleStoreEntry packageName={group.google!.packageName} />
              </div>
              <Separator className="md:hidden" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-5 rounded bg-blue-500/10 flex items-center justify-center">
                    <span className="text-xs">A</span>
                  </div>
                  <span className="text-sm font-medium">App Store</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                    <a href={`https://apps.apple.com/app/id${group.apple!.appId}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  </Button>
                  <PlatformFilter
                    platforms={group.apple!.platforms}
                    onChange={(platforms) =>
                      onUpdate(group.id, { apple: { ...group.apple!, platforms } })
                    }
                  />
                </div>
                <AppleStoreEntry appId={group.apple!.appId} platforms={group.apple!.platforms} />
              </div>
            </div>
          ) : (
            <div>
              {group.google && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">Google Play</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                      <a href={`https://play.google.com/store/apps/details?id=${group.google.packageName}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </Button>
                  </div>
                  <GoogleStoreEntry packageName={group.google.packageName} />
                </>
              )}
              {group.apple && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">App Store</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                      <a href={`https://apps.apple.com/app/id${group.apple.appId}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </Button>
                    <PlatformFilter
                      platforms={group.apple.platforms}
                      onChange={(platforms) =>
                        onUpdate(group.id, { apple: { ...group.apple!, platforms } })
                      }
                    />
                  </div>
                  <AppleStoreEntry appId={group.apple.appId} platforms={group.apple.platforms} />
                </>
              )}
            </div>
          )}
          {(!group.google || !group.apple) && (
            <div className="mt-4 pt-3 border-t border-dashed">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs h-7"
                onClick={() => setLinkStore(group.google ? "apple" : "google")}
              >
                <Plus className="h-3 w-3 mr-1" />
                Link {group.google ? "App Store" : "Google Play"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {linkStore && (
        <LinkStoreDialog
          open={!!linkStore}
          onOpenChange={(v) => { if (!v) setLinkStore(null); }}
          store={linkStore}
          onLink={(data) => onUpdate(group.id, data)}
          excludeAppleAppIds={linkedAppleAppIds}
        />
      )}
    </>
  );
}

function PlatformFilter({
  platforms,
  onChange,
}: {
  platforms?: string[];
  onChange: (platforms: string[] | undefined) => void;
}) {
  const current = platforms ?? APPLE_PLATFORMS.map((p) => p.value);
  const isFiltered = current.length < APPLE_PLATFORMS.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <SlidersHorizontal className={`h-3 w-3 ${isFiltered ? "text-primary" : "text-muted-foreground"}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="start">
        <div className="space-y-1">
          {APPLE_PLATFORMS.map((p) => (
            <label key={p.value} className="flex items-center gap-1.5 text-sm py-0.5">
              <Checkbox
                checked={current.includes(p.value)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...current, p.value]
                    : current.filter((v) => v !== p.value);
                  onChange(next.length >= APPLE_PLATFORMS.length ? undefined : next);
                }}
              />
              {p.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
