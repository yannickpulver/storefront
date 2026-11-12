"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { LogOut, Plus, RefreshCw, Search, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppList, StatusLegend } from "@/components/app-list";
import { AppPanel } from "@/components/app-panel";
import { AddAppsDialog } from "@/components/add-apps-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { EmptyState } from "@/components/empty-state";
import { StoreIcon } from "@/components/store-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { columnsOf, matchesFilter, summarizeApps, type AppFilter, type AppSummary } from "@/components/app-summary";
import { useAppGroups } from "@/hooks/use-app-groups";
import { useReleases } from "@/hooks/use-store-data";

const filters: { value: AppFilter; label: ReactNode }[] = [
  { value: "review", label: "In review" },
  { value: "issue", label: "Issues" },
  { value: "google", label: <StoreIcon store="google" /> },
  { value: "apple", label: <StoreIcon store="apple" /> },
];

type Env = "prod" | "dev";

const envs: { value: Env; label: string }[] = [
  { value: "prod", label: "Prod" },
  { value: "dev", label: "Dev" },
];

function matchesSearch(app: AppSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { name, google, apple } = app.group;
  return [name, google?.packageName, apple?.bundleId].some((s) => s?.toLowerCase().includes(q));
}

/** Opens an app in the side panel via `?app=`, without a server round trip. */
function setSelected(id: string | null) {
  window.history.pushState(null, "", id === null ? window.location.pathname : `?app=${id}`);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Dashboard({ userEmail }: { userEmail: string }) {
  const { groups, loaded, mutate: mutateGroups, updateGroup, removeGroup, reorderGroups } =
    useAppGroups();
  const releases = useReleases(loaded && groups.length > 0);
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AppFilter | null>(null);
  const [env, setEnv] = useState<Env | null>(null);

  const apps = useMemo(() => summarizeApps(groups, releases.data), [groups, releases.data]);
  const selectedId = searchParams.get("app");
  const selected = apps.find((a) => a.group.id === selectedId) ?? null;
  const selectedIndex = groups.findIndex((g) => g.id === selectedId);

  const visible = apps.filter(
    (a) =>
      (!env || a.isDev === (env === "dev")) && matchesFilter(a, filter) && matchesSearch(a, query)
  );
  const attention = visible.filter((a) => a.needsAttention);
  const rest = visible.filter((a) => !a.needsAttention);
  const columns = columnsOf(visible);

  const move = (from: number, to: number) => () => {
    const ids = groups.map((g) => g.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    reorderGroups(ids);
  };

  const refreshReleases = () => releases.mutate();

  return (
    <div className={cn("transition-[padding] duration-200", selected && "xl:pr-[36rem]")}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Storefront</h1>
            <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="icon" title="Settings" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" title="Sign out" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {!loaded ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search apps"
                  className="h-9 pl-8"
                />
              </div>
              <div className="flex gap-1.5">
                {filters.map((f) => (
                  <Button
                    key={f.value}
                    variant={filter === f.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(filter === f.value ? null : f.value)}
                    aria-pressed={filter === f.value}
                    title={typeof f.label === "string" ? undefined : `Only ${f.value} apps`}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {envs.map((e) => (
                  <Button
                    key={e.value}
                    variant={env === e.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEnv(env === e.value ? null : e.value)}
                    aria-pressed={env === e.value}
                  >
                    {e.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshReleases}
                  disabled={releases.isValidating}
                  title="Read the stores again"
                >
                  <RefreshCw className={cn("h-4 w-4", releases.isValidating && "animate-spin")} />
                </Button>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add apps
                </Button>
              </div>
            </div>

            {releases.error && (
              <p className="text-sm text-destructive mb-6">
                Could not read the stores: {releases.error.error ?? "unknown error"}
              </p>
            )}
            {visible.length === 0 && <p className="text-sm text-muted-foreground">No apps match.</p>}
            {attention.length > 0 && (
              <Section title="Needs attention">
                <AppList apps={attention} columns={columns} selectedId={selectedId} onSelect={setSelected} />
              </Section>
            )}
            {rest.length > 0 && (
              <Section title={attention.length > 0 ? "All other apps" : "Apps"}>
                <AppList apps={rest} columns={columns} selectedId={selectedId} onSelect={setSelected} />
              </Section>
            )}
            {visible.length > 0 && <StatusLegend />}
          </>
        )}
      </div>

      <AppPanel
        app={selected}
        onClose={() => setSelected(null)}
        onUpdate={async (id, patch) => {
          await updateGroup(id, patch);
          // A store or platform change alters what the stores return for the app.
          if (patch.google !== undefined || patch.apple !== undefined) refreshReleases();
        }}
        onRemove={(id) => {
          setSelected(null);
          removeGroup(id);
        }}
        onMoveUp={selectedIndex > 0 ? move(selectedIndex - 1, selectedIndex) : undefined}
        onMoveDown={
          selectedIndex >= 0 && selectedIndex < groups.length - 1
            ? move(selectedIndex, selectedIndex + 1)
            : undefined
        }
        onReleasesChanged={refreshReleases}
        linkedAppleAppIds={groups.flatMap((g) => (g.apple ? [g.apple.appId] : []))}
        linkedGooglePackageNames={groups.flatMap((g) => (g.google ? [g.google.packageName] : []))}
      />

      <AddAppsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        groups={groups}
        onAdded={() => {
          mutateGroups();
          refreshReleases();
        }}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
