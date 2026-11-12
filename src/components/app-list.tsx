"use client";

import type { CSSProperties } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { stripVersionCode } from "@/lib/releases";
import { columnStore, type Alert, type AppSummary, type Attention, type Column } from "@/components/app-summary";
import { AppIcon, iconUrlOf } from "@/components/app-icon";
import { StatusIcon, categoryStyles, categoryText, statusLabel } from "@/components/status-badge";
import { StoreIcon } from "@/components/store-icon";
import { toneStyles, toneText } from "@/components/tone";
import type { NormalizedRelease, StatusCategory } from "@/lib/types";

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

const releaseTitle = (r: NormalizedRelease) =>
  `${stripVersionCode(r.version, r.versionCode)} · ${statusLabel(r.status)}`;

/**
 * One release in a cell: version, with a status icon unless it is live. Wider screens add the
 * status in words.
 */
function ReleaseLine({ release }: { release: NormalizedRelease }) {
  const live = release.statusCategory === "live";
  return (
    <div className="flex min-w-0 items-center gap-1" title={releaseTitle(release)}>
      {!live && <StatusIcon category={release.statusCategory} />}
      <span className={cn("font-mono text-xs", !live && categoryText[release.statusCategory])}>
        {stripVersionCode(release.version, release.versionCode)}
      </span>
      {!live && (
        <span className={cn("hidden truncate text-xs sm:inline", categoryText[release.statusCategory])}>
          {statusLabel(release.status)}
        </span>
      )}
    </div>
  );
}

function Cell({ app, column }: { app: AppSummary; column: Column }) {
  const lane = app.lanes.find((l) => l.column === column);
  if (!lane) {
    // Before releases arrive, a store's first column holds the placeholder.
    const loading = app.loading && (column === "Play" || column === "iOS") && app.stores.includes(columnStore(column));
    return loading ? <Skeleton className="h-4 w-10" /> : <span className="text-xs text-muted-foreground">—</span>;
  }
  const rows = lane.current ? [lane.current, ...lane.waiting] : lane.waiting;
  if (rows.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 sm:items-start">
      {rows.map((r, i) => (
        <ReleaseLine key={i} release={r} />
      ))}
    </div>
  );
}

function AlertIcon({ alert }: { alert: Alert }) {
  return (
    <span title={`${alert.label}: ${alert.reason}`} className={toneText[alert.tone]}>
      <TriangleAlert className="h-3.5 w-3.5" aria-label={alert.label} />
    </span>
  );
}

// Fixed column widths, so the tables of both sections line up.
const GRID =
  "grid grid-cols-[minmax(0,1fr)_repeat(var(--cols),4.25rem)] sm:grid-cols-[minmax(0,1fr)_repeat(var(--cols),11rem)]";
const CELL = "flex justify-center px-1 sm:justify-start";

/** Apps down, stores across: the live version per cell, releases in flight below it. */
export function AppList({
  apps,
  columns,
  selectedId,
  onSelect,
}: {
  apps: AppSummary[];
  columns: Column[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={GRID} style={{ "--cols": columns.length } as CSSProperties}>
      <div className="col-span-full grid grid-cols-subgrid pb-2">
        <div />
        {columns.map((column) => (
          <div key={column} className={cn(CELL, "items-center gap-1 text-xs text-muted-foreground")}>
            <StoreIcon store={columnStore(column)} />
            {column}
          </div>
        ))}
      </div>
      {apps.map((app) => {
        const { group, alerts, isDev, dateLabel } = app;
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
              "col-span-full grid grid-cols-subgrid items-center border-t py-2.5 px-1 rounded-md cursor-pointer hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              group.id === selectedId && "bg-accent"
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <AppIcon iconUrl={iconUrlOf(group)} name={group.name} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{group.name}</span>
                  {isDev && <DevBadge />}
                  {alerts.map((alert) => (
                    <AlertIcon key={alert.key} alert={alert} />
                  ))}
                </div>
                {dateLabel && <div className="hidden text-xs text-muted-foreground sm:block">{dateLabel}</div>}
              </div>
            </div>
            {columns.map((column) => (
              <div key={column} className={CELL}>
                <Cell app={app} column={column} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const LEGEND: { category: StatusCategory; label: string }[] = [
  { category: "review", label: "In review" },
  { category: "pending", label: "Ready to publish" },
  { category: "issue", label: "Rejected or halted" },
  { category: "draft", label: "Draft" },
];

/** What the status icons mean; wider screens spell the status out in the cells. */
export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:hidden">
      {LEGEND.map(({ category, label }) => (
        <span key={category} className="flex items-center gap-1">
          <StatusIcon category={category} />
          {label}
        </span>
      ))}
    </div>
  );
}
