"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StoreIcon } from "@/components/store-icon";
import { formatDate } from "@/lib/utils";
import { computeMatches, type AppPair, type MatchResult, type SingleApp } from "@/lib/app-matching";
import type { AppGroup } from "@/lib/types";
import { useAppleApps, useGoogleApps } from "@/hooks/use-store-data";

interface SettingsStatus {
  googleServiceAccountJson: boolean;
  appleIssuerId: boolean;
  appleKeyId: boolean;
  applePrivateKey: boolean;
}

const pairKey = (pair: AppPair) => `${pair.google.packageName}|${pair.apple.appId}`;

const singleKey = (single: SingleApp) =>
  single.store === "google" ? `google:${single.app.packageName}` : `apple:${single.app.appId}`;

const singleName = (single: SingleApp) =>
  single.store === "google" ? single.app.displayName : single.app.name;

const singleSubtitle = (single: SingleApp) =>
  single.store === "google" ? single.app.packageName : single.app.bundleId;

const uploadedAt = (app: { lastUploadAt?: string }) =>
  app.lastUploadAt ? new Date(app.lastUploadAt).getTime() || 0 : 0;

const pairUploadedAt = (pair: AppPair) => Math.max(uploadedAt(pair.google), uploadedAt(pair.apple));

/** Newest upload first. Apps without a date go last, alphabetically. */
function byNewest<T>(uploaded: (item: T) => number, name: (item: T) => string) {
  return (a: T, b: T) => uploaded(b) - uploaded(a) || name(a).localeCompare(name(b));
}

function sortByNewest(result: MatchResult): MatchResult {
  const pairs = byNewest(pairUploadedAt, (p: AppPair) => p.google.displayName);
  const singles = byNewest((s: SingleApp) => uploadedAt(s.app), singleName);
  return {
    matched: [...result.matched].sort(pairs),
    fuzzyMatched: [...result.fuzzyMatched].sort(pairs),
    singleRegular: [...result.singleRegular].sort(singles),
    singleInternal: [...result.singleInternal].sort(singles),
  };
}

function pairBody({ google, apple }: AppPair): Partial<AppGroup> {
  return {
    name: google.displayName,
    google: { packageName: google.packageName, name: google.displayName },
    apple: { appId: apple.appId, name: apple.name, bundleId: apple.bundleId },
  };
}

function singleBody(single: SingleApp): Partial<AppGroup> {
  if (single.store === "google") {
    const app = single.app;
    return { name: app.displayName, google: { packageName: app.packageName, name: app.displayName } };
  }
  const app = single.app;
  return { name: app.name, apple: { appId: app.appId, name: app.name, bundleId: app.bundleId } };
}

/** The other store's side only, so a partial group keeps its name and settings. */
function completionBody(pair: AppPair, existing: AppGroup): Partial<AppGroup> {
  const body = pairBody(pair);
  return existing.google ? { apple: body.apple } : { google: body.google };
}

type SetSelected = (fn: (prev: Set<string>) => Set<string>) => void;

function toggle(setSelected: SetSelected, key: string) {
  setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}

function toggleAll(keys: string[], selected: Set<string>, setSelected: SetSelected) {
  const allSelected = keys.length > 0 && keys.every((k) => selected.has(k));
  setSelected((prev) => {
    const next = new Set(prev);
    keys.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
    return next;
  });
}

export function AddAppsDialog({
  open,
  onOpenChange,
  groups,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: AppGroup[];
  onAdded: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [internalCollapsed, setInternalCollapsed] = useState(true);

  const { data: settings } = useSWR<SettingsStatus>(open ? "/api/settings" : null, (url: string) =>
    fetch(url).then((r) => r.json())
  );
  const googleConfigured = !!settings?.googleServiceAccountJson;
  const appleConfigured =
    !!settings?.appleIssuerId && !!settings?.appleKeyId && !!settings?.applePrivateKey;
  const google = useGoogleApps(open && googleConfigured);
  const apple = useAppleApps(open && appleConfigured);

  const loading = !settings || google.isLoading || apple.isLoading;
  const failed = [google.error && "Google Play", apple.error && "App Store"].filter(Boolean);

  const result = useMemo(
    () => sortByNewest(computeMatches(google.data ?? [], apple.data ?? [], groups)),
    [google.data, apple.data, groups]
  );

  // Exact pairs are almost always wanted, so they start selected.
  useEffect(() => {
    if (open && !loading) setSelected(new Set(result.matched.map(pairKey)));
  }, [open, loading, result]);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const requests = [
        ...[...result.matched, ...result.fuzzyMatched]
          .filter((pair) => selected.has(pairKey(pair)))
          .map((pair) => {
            const existing = groups.find((g) => g.id === pair.existingGroupId);
            return existing
              ? { url: `/api/app-groups/${existing.id}`, method: "PATCH", body: completionBody(pair, existing) }
              : { url: "/api/app-groups", method: "POST", body: pairBody(pair) };
          }),
        ...[...result.singleRegular, ...result.singleInternal]
          .filter((single) => selected.has(singleKey(single)))
          .map((single) => ({ url: "/api/app-groups", method: "POST", body: singleBody(single) })),
      ];

      // One after the other, so new groups keep the order of the list.
      let failedCount = 0;
      for (const { url, method, body } of requests) {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch(() => null);
        if (!res?.ok) failedCount++;
      }
      onAdded();
      if (failedCount > 0) {
        setError(`${failedCount} of ${requests.length} could not be saved. Please try again.`);
        return;
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const { matched, fuzzyMatched, singleRegular, singleInternal } = result;
  const matchedKeys = matched.map(pairKey);
  const fuzzyKeys = fuzzyMatched.map(pairKey);
  const regularKeys = singleRegular.map(singleKey);
  const internalKeys = singleInternal.map(singleKey);
  const groupCount = [...matchedKeys, ...fuzzyKeys, ...regularKeys, ...internalKeys].filter((k) =>
    selected.has(k)
  ).length;
  const nothingFound =
    matched.length + fuzzyMatched.length + singleRegular.length + singleInternal.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setError(null);
          setInternalCollapsed(true);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add apps</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto flex-1 pr-1">
          {failed.length > 0 && (
            <p className="text-sm text-destructive">
              Could not list the apps of {failed.join(" and ")}. Check the keys in Settings.
            </p>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !googleConfigured && !appleConfigured ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No store keys yet. Add them in Settings first.
            </p>
          ) : nothingFound ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              All apps are already added.
            </p>
          ) : (
            <>
              {matched.length > 0 && (
                <section className="space-y-2">
                  <SectionHeader
                    title={`${matched.length} app${matched.length !== 1 ? "s" : ""} found on both stores`}
                    allSelected={matchedKeys.every((k) => selected.has(k))}
                    onToggleAll={() => toggleAll(matchedKeys, selected, setSelected)}
                  />
                  <div className="space-y-1">
                    {matched.map((pair) => (
                      <Row key={pairKey(pair)} checked={selected.has(pairKey(pair))} onToggle={() => toggle(setSelected, pairKey(pair))}>
                        <span className="flex-1 font-medium truncate">{pair.google.displayName}</span>
                        <UploadDate timestamp={pairUploadedAt(pair)} />
                        <StoreIcon store="google" className="text-muted-foreground" />
                        <StoreIcon store="apple" className="text-muted-foreground" />
                        {pair.existingGroupId && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            Update
                          </Badge>
                        )}
                      </Row>
                    ))}
                  </div>
                </section>
              )}

              {fuzzyMatched.length > 0 && (
                <section className="space-y-2">
                  <SectionHeader
                    title={`${fuzzyMatched.length} proposed match${fuzzyMatched.length !== 1 ? "es" : ""} — likely the same app`}
                    allSelected={fuzzyKeys.every((k) => selected.has(k))}
                    onToggleAll={() => toggleAll(fuzzyKeys, selected, setSelected)}
                  />
                  <div className="space-y-1">
                    {fuzzyMatched.map((pair) => (
                      <Row key={pairKey(pair)} checked={selected.has(pairKey(pair))} onToggle={() => toggle(setSelected, pairKey(pair))}>
                        <span className="flex-1 font-medium truncate">{pair.google.displayName}</span>
                        <span className="text-muted-foreground">≈</span>
                        <span className="flex-1 font-medium truncate text-right">{pair.apple.name}</span>
                        <UploadDate timestamp={pairUploadedAt(pair)} />
                        <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
                          {Math.round((pair.score ?? 0) * 100)}%
                        </Badge>
                      </Row>
                    ))}
                  </div>
                </section>
              )}

              {singleRegular.length > 0 && (
                <section className="space-y-2">
                  <SectionHeader
                    title={`${singleRegular.length} app${singleRegular.length !== 1 ? "s" : ""} on one store only`}
                    allSelected={regularKeys.every((k) => selected.has(k))}
                    onToggleAll={() => toggleAll(regularKeys, selected, setSelected)}
                  />
                  <SingleList singles={singleRegular} selected={selected} setSelected={setSelected} />
                </section>
              )}

              {singleInternal.length > 0 && (
                <section className="space-y-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm font-semibold hover:text-muted-foreground w-full text-left"
                    onClick={() => setInternalCollapsed((v) => !v)}
                  >
                    {internalCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    )}
                    Internal apps ({singleInternal.length})
                  </button>
                  {!internalCollapsed && (
                    <>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => toggleAll(internalKeys, selected, setSelected)}
                        >
                          {internalKeys.every((k) => selected.has(k)) ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      <SingleList singles={singleInternal} selected={selected} setSelected={setSelected} />
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {error && <p className="text-sm text-destructive flex-1">{error}</p>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || loading || groupCount === 0}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add {groupCount > 0 ? `${groupCount} app${groupCount !== 1 ? "s" : ""}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadDate({ timestamp }: { timestamp: number }) {
  if (!timestamp) return null;
  return (
    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatDate(timestamp)}</span>
  );
}

function Row({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      {children}
    </label>
  );
}

function SectionHeader({
  title,
  allSelected,
  onToggleAll,
}: {
  title: string;
  allSelected: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-semibold">{title}</p>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        onClick={onToggleAll}
      >
        {allSelected ? "Deselect all" : "Select all"}
      </button>
    </div>
  );
}

function SingleList({
  singles,
  selected,
  setSelected,
}: {
  singles: SingleApp[];
  selected: Set<string>;
  setSelected: SetSelected;
}) {
  return (
    <div className="space-y-1">
      {singles.map((single) => {
        const key = singleKey(single);
        return (
          <Row key={key} checked={selected.has(key)} onToggle={() => toggle(setSelected, key)}>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{singleName(single)}</p>
              <p className="text-xs text-muted-foreground truncate">{singleSubtitle(single)}</p>
            </div>
            <UploadDate timestamp={uploadedAt(single.app)} />
            <StoreIcon store={single.store} className="text-muted-foreground" />
          </Row>
        );
      })}
    </div>
  );
}
