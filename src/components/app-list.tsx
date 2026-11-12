"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { stripVersionCode } from "@/lib/releases";
import type { Alert, AppSummary, Attention } from "@/components/app-summary";
import { AppIcon, iconUrlOf } from "@/components/app-icon";
import { StatusBadge, categoryStyles, statusLabel } from "@/components/status-badge";
import { StoreIcon } from "@/components/store-icon";
import { toneStyles } from "@/components/tone";

export function AttentionChip({ attention }: { attention: Attention }) {
  return (
    <Badge variant="outline" className={categoryStyles[attention.category]}>
      <StoreIcon store={attention.store} />
      {statusLabel(attention.release.status)}
    </Badge>
  );
}

export function AlertChip({ alert }: { alert: Alert }) {
  return (
    <Badge variant="outline" className={toneStyles[alert.tone]} title={alert.reason}>
      <StoreIcon store={alert.store} />
      {alert.label}
    </Badge>
  );
}

export function DevBadge() {
  return (
    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wide">
      Dev
    </Badge>
  );
}

/**
 * Per store, and per platform on the App Store: icon, then current version on top and releases
 * waiting for review or publishing below.
 */
function StoreVersions({ stores, lanes, loading }: AppSummary) {
  if (loading) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {stores.map((store) => (
          <div key={store} className="flex items-center gap-x-1.5">
            <StoreIcon store={store} className="text-muted-foreground" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {lanes.map(({ store, label, current, waiting }) => {
        const rows = current ? [current, ...waiting] : waiting;
        return (
          <div key={`${store}-${label}`} className="flex items-center gap-x-1.5">
            <StoreIcon store={store} className="text-muted-foreground" />
            {label && <span className="text-xs text-muted-foreground">{label}</span>}
            {rows.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              <div className="grid grid-cols-[auto_auto] items-center justify-items-start gap-x-1.5 gap-y-1">
                {rows.flatMap((r, i) => [
                  <span key={`${i}-version`} className="text-xs font-mono">
                    {stripVersionCode(r.version, r.versionCode)}
                  </span>,
                  <StatusBadge key={`${i}-status`} status={r.status} category={r.statusCategory} />,
                ])}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AppList({
  apps,
  selectedId,
  onSelect,
}: {
  apps: AppSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {apps.map((app) => {
        const { group, stores, alerts, isDev, dateLabel } = app;
        return (
          <div
            key={group.id}
            role="button"
            tabIndex={0}
            aria-current={group.id === selectedId}
            onClick={() => onSelect(group.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(group.id);
              }
            }}
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              group.id === selectedId && "bg-accent border-foreground/20"
            )}
          >
            <AppIcon iconUrl={iconUrlOf(group)} name={group.name} />
            {/* On phones the name takes the rest of the first row, so versions wrap below it. */}
            <div className="min-w-0 grow basis-[calc(100%-2.75rem)] sm:basis-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{group.name}</span>
                {isDev && <DevBadge />}
              </div>
              {dateLabel && <span className="text-xs text-muted-foreground">{dateLabel}</span>}
            </div>
            {alerts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {alerts.map((alert) => (
                  <AlertChip key={alert.key} alert={alert} />
                ))}
              </div>
            )}
            {stores.length > 0 ? (
              <StoreVersions {...app} />
            ) : (
              <span className="text-xs text-muted-foreground">No stores linked</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
