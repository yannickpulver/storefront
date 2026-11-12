"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Link2, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ReleaseList } from "@/components/release-list";
import { ReviewList } from "@/components/review-list";
import { LinkStoreDialog } from "@/components/link-store-dialog";
import { AppIcon, iconUrlOf } from "@/components/app-icon";
import { AlertChip, AttentionChip, DevBadge } from "@/components/app-list";
import { StoreIcon, storeNames } from "@/components/store-icon";
import type { AppSummary } from "@/components/app-summary";
import { parsePlayConsoleUrl } from "@/lib/google/console";
import { PLATFORM_LABELS } from "@/lib/apple/platforms";
import type { Store } from "@/lib/releases";
import type { AppGroup } from "@/lib/types";
import { useAppleReviews, useGoogleReviews, useGoogleVitals } from "@/hooks/use-store-data";

export interface PanelActions {
  onUpdate: (id: string, patch: Partial<AppGroup>) => void;
  onRemove: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onReleasesChanged: () => void;
  linkedAppleAppIds: string[];
  linkedGooglePackageNames: string[];
}

export function AppPanel({
  app,
  onClose,
  ...actions
}: { app: AppSummary | null; onClose: () => void } & PanelActions) {
  return (
    <Sheet open={!!app} onOpenChange={(open) => !open && onClose()}>
      {app && (
        <SheetContent>
          {/* Keyed by app so switching apps resets scroll and expanded reviews */}
          <PanelContent key={app.group.id} app={app} {...actions} />
        </SheetContent>
      )}
    </Sheet>
  );
}

function PanelContent({ app, ...actions }: { app: AppSummary } & PanelActions) {
  const { group, stores, attention, alerts } = app;
  const [linkStore, setLinkStore] = useState<Store | null>(null);

  return (
    <>
      <div className="flex items-center gap-3 border-b p-4 pr-12">
        <AppIcon
          iconUrl={iconUrlOf(group)}
          name={group.name}
          onDropIcon={(customIcon) => actions.onUpdate(group.id, { customIcon })}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SheetTitle className="font-semibold truncate">{group.name}</SheetTitle>
            {app.isDev && <DevBadge />}
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {app.dateLabel ?? "No uploads yet"}
          </SheetDescription>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton title="Move up" onClick={actions.onMoveUp}>
            <ChevronUp className="h-4 w-4" />
          </IconButton>
          <IconButton title="Move down" onClick={actions.onMoveDown}>
            <ChevronDown className="h-4 w-4" />
          </IconButton>
          <IconButton
            title="Remove app"
            className="hover:text-destructive"
            onClick={() => {
              if (confirm(`Remove ${group.name} from the dashboard?`)) actions.onRemove(group.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {app.needsAttention && (
          <div className="flex flex-wrap gap-1.5">
            {attention.map((a) => (
              <AttentionChip key={`${a.store}-${a.release.track}-${a.category}`} attention={a} />
            ))}
            {alerts.map((alert) => (
              <AlertChip key={alert.key} alert={alert} />
            ))}
          </div>
        )}
        {stores.map((store) =>
          store === "google" ? (
            <GoogleSection key={store} app={app} {...actions} />
          ) : (
            <AppleSection key={store} app={app} {...actions} />
          )
        )}
        {stores.length < 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-xs h-7"
            onClick={() => setLinkStore(group.google ? "apple" : "google")}
          >
            <Plus className="h-3 w-3 mr-1" />
            Link {group.google ? "App Store" : "Google Play"}
          </Button>
        )}
      </div>

      {linkStore && (
        <LinkStoreDialog
          open
          onOpenChange={(v) => !v && setLinkStore(null)}
          store={linkStore}
          onLink={(data) => actions.onUpdate(group.id, data)}
          excludeAppleAppIds={actions.linkedAppleAppIds}
          excludeGooglePackageNames={actions.linkedGooglePackageNames}
        />
      )}
    </>
  );
}

function GoogleSection({ app, onUpdate, onReleasesChanged }: { app: AppSummary } & PanelActions) {
  const google = app.group.google!;
  const { data: reviews, isLoading } = useGoogleReviews(google.packageName);
  const { data: vitals } = useGoogleVitals(google.packageName);

  return (
    <section>
      <StoreHeader
        store="google"
        storeUrl={`https://play.google.com/store/apps/details?id=${google.packageName}`}
      >
        {google.consoleUrl && (
          <HeaderLink href={google.consoleUrl} title="Open in Play Console">
            <Link2 className="h-3.5 w-3.5" />
          </HeaderLink>
        )}
        <ConsoleUrlEditor
          value={google.consoleUrl}
          onSave={(consoleUrl) => onUpdate(app.group.id, { google: { ...google, consoleUrl } })}
        />
      </StoreHeader>
      <SectionLabel>Releases</SectionLabel>
      <StoreReleases app={app} store="google">
        <ReleaseList
          releases={app.releases.google ?? []}
          packageName={google.packageName}
          playConsoleUrl={google.consoleUrl}
          vitals={vitals}
          onReleasesChanged={onReleasesChanged}
        />
      </StoreReleases>
      <SectionLabel className="mt-5">Reviews</SectionLabel>
      {isLoading ? <ReviewsSkeleton /> : <ReviewList reviews={reviews ?? []} />}
    </section>
  );
}

function AppleSection({ app, onUpdate }: { app: AppSummary } & PanelActions) {
  const apple = app.group.apple!;
  const { data: reviews, isLoading } = useAppleReviews(apple.appId);

  return (
    <section>
      <StoreHeader store="apple" storeUrl={`https://apps.apple.com/app/id${apple.appId}`}>
        <HeaderLink
          href={`https://appstoreconnect.apple.com/apps/${apple.appId}`}
          title="Open in App Store Connect"
        >
          <Link2 className="h-3.5 w-3.5" />
        </HeaderLink>
        <PlatformFilter
          platforms={apple.platforms}
          onChange={(platforms) => onUpdate(app.group.id, { apple: { ...apple, platforms } })}
        />
      </StoreHeader>
      <SectionLabel>Releases</SectionLabel>
      <StoreReleases app={app} store="apple">
        <ReleaseList releases={app.releases.apple ?? []} appleAppId={apple.appId} />
      </StoreReleases>
      <SectionLabel className="mt-5">Reviews</SectionLabel>
      {isLoading ? <ReviewsSkeleton /> : <ReviewList reviews={reviews ?? []} />}
    </section>
  );
}

function StoreReleases({ app, store, children }: { app: AppSummary; store: Store; children: ReactNode }) {
  if (app.loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    );
  }
  const error = app.alerts.find((a) => a.key === `error:${store}`);
  if (error) return <p className="text-sm text-destructive break-words">{error.reason}</p>;
  return children;
}

function StoreHeader({
  store,
  storeUrl,
  children,
}: {
  store: Store;
  storeUrl: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <StoreIcon store={store} className="h-4 w-4" />
      <h3 className="text-sm font-medium">{storeNames[store]}</h3>
      <HeaderLink href={storeUrl} title={`Open in ${storeNames[store]}`}>
        <ExternalLink className="h-3.5 w-3.5" />
      </HeaderLink>
      {children}
    </div>
  );
}

function HeaderLink({ href, title, children }: { href: string; title: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="text-muted-foreground hover:text-foreground"
    >
      {children}
    </a>
  );
}

/** Sets the app's Play Console link, so releases open their track page. */
function ConsoleUrlEditor({
  value,
  onSave,
}: {
  value?: string;
  onSave: (url: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const parsed = parsePlayConsoleUrl(draft);
  const invalid = draft.trim() !== "" && !parsed;

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setDraft(value ?? "");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          {value ? "Edit Play Console link" : "Add Play Console link"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2" align="end">
        <p className="text-xs text-muted-foreground">
          Paste any Play Console page of this app; releases then open their track there.
        </p>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://play.google.com/console/u/0/developers/…/app/…"
          className="h-8 text-xs"
        />
        {invalid && <p className="text-xs text-destructive">Not a Play Console app URL</p>}
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={invalid}
            onClick={() => {
              onSave(parsed ?? undefined);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const APPLE_PLATFORMS = Object.entries(PLATFORM_LABELS).map(([value, label]) => ({ value, label }));

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
        <button type="button" title="Platforms" className="ml-auto">
          <SlidersHorizontal
            className={`h-3.5 w-3.5 ${isFiltered ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="end">
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

function IconButton({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      title={title}
      disabled={!onClick}
      onClick={onClick}
      className={`text-muted-foreground h-8 w-8 p-0 ${className ?? ""}`}
    >
      {children}
    </Button>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 ${className ?? ""}`}>
      {children}
    </p>
  );
}
