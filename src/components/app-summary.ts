import { formatDate } from "@/lib/utils";
import {
  filterLatestReleases,
  isTestFlight,
  testFlightExpiry,
  type ReleasesByGroup,
  type Store,
} from "@/lib/releases";
import type { AppGroup, NormalizedRelease, StatusCategory } from "@/lib/types";

type AttentionCategory = Extract<StatusCategory, "issue" | "review" | "pending">;
export type AppFilter = "review" | "issue" | Store;

export interface Attention {
  store: Store;
  category: AttentionCategory;
  release: NormalizedRelease;
}

/** Something about an app that waits for someone besides a release's store state. */
export interface Alert {
  key: string;
  tone: "red" | "amber";
  store: Store;
  label: string;
  /** Why it counts, for the hover text. */
  reason: string;
}

/** Columns of the app matrix, in display order: Google Play, then the Apple platforms. */
export const COLUMNS = ["Play", "iOS", "macOS", "tvOS", "visionOS"] as const;
export type Column = (typeof COLUMNS)[number];
export const columnStore = (column: Column): Store => (column === "Play" ? "google" : "apple");

/** One cell of the app matrix: a Google app, or one Apple platform. */
export interface Lane {
  store: Store;
  column: Column;
  /** The live release, else the newest that is not a draft. */
  current: NormalizedRelease | null;
  /** Releases besides `current` that wait for someone. */
  waiting: NormalizedRelease[];
}

export interface AppSummary {
  group: AppGroup;
  stores: Store[];
  /** A store's releases have not arrived yet. */
  loading: boolean;
  /** The releases worth showing per store. */
  releases: Partial<Record<Store, NormalizedRelease[]>>;
  /** Version columns of the list row, in store order. */
  lanes: Lane[];
  /** Releases that wait for someone: rejected or halted, in review, or waiting to publish. */
  attention: Attention[];
  /** Most severe first. */
  alerts: Alert[];
  needsAttention: boolean;
  /** Name marks it as a non-production build (dev, staging, test, …). */
  isDev: boolean;
  /** "Last upload …" from the newest build. */
  dateLabel: string | null;
}

const DEV_NAME = /\b(dev|stage|staging|test|testing|internal|demo|abnahme)\b/i;

const ATTENTION_ORDER: AttentionCategory[] = ["issue", "review", "pending"];

const uploadedAt = (r: NormalizedRelease) => Date.parse(r.publishedAt ?? "") || 0;

function attentionOf(store: Store, releases: NormalizedRelease[]): Attention[] {
  return ATTENTION_ORDER.flatMap((category) => {
    const release = releases.find((r) => r.statusCategory === category);
    return release ? [{ store, category, release }] : [];
  });
}

const currentOf = (releases: NormalizedRelease[]) =>
  releases.find((r) => r.statusCategory === "live") ??
  releases.find((r) => r.statusCategory !== "draft") ??
  releases[0] ??
  null;

/**
 * Google: one lane. Apple: one lane per platform with a store version; an app with TestFlight
 * builds only gets one lane for those.
 */
function lanesOf(store: Store, latest: NormalizedRelease[]): { lane: Lane; attention: Attention[] }[] {
  const storeReleases = latest.filter((r) => !isTestFlight(r));
  const groups: { column: Column; releases: NormalizedRelease[] }[] =
    store === "google"
      ? [{ column: "Play", releases: latest }]
      : storeReleases.length === 0
        ? [{ column: "iOS", releases: latest }]
        : [...new Set(storeReleases.map((r) => r.track))].map((track) => ({
            column: (COLUMNS as readonly string[]).includes(track) ? (track as Column) : "iOS",
            releases: storeReleases.filter((r) => r.track === track),
          }));
  return groups.map(({ column, releases }) => {
    const attention = attentionOf(store, releases.filter((r) => !isTestFlight(r)));
    const current = currentOf(releases);
    return {
      lane: {
        store,
        column,
        current,
        waiting: attention.map((a) => a.release).filter((r) => r !== current),
      },
      attention,
    };
  });
}

/** The newest TestFlight build in its last week: testers lose it once it expires. */
function testFlightAlert(latest: NormalizedRelease[], now: number): Alert | null {
  const newest = latest.filter((r) => isTestFlight(r) && r.expiresAt).sort((a, b) => uploadedAt(b) - uploadedAt(a))[0];
  const expiry = newest && testFlightExpiry(newest, now);
  if (!newest?.expiresAt || !expiry?.warn || Date.parse(newest.expiresAt) < now) return null;
  return {
    key: "testflight",
    tone: "amber",
    store: "apple",
    label: `TestFlight ${expiry.text}`,
    reason: `Build ${newest.version} (${newest.versionCode}) is the newest TestFlight build; testers lose it on ${formatDate(newest.expiresAt)} unless a newer one is uploaded.`,
  };
}

/**
 * The matrix columns the apps use. While an app's releases load, its stores count with their
 * first column, so the table does not jump once they arrive.
 */
export function columnsOf(apps: AppSummary[]): Column[] {
  const used = new Set<Column>();
  for (const app of apps) {
    for (const lane of app.lanes) used.add(lane.column);
    if (app.loading) for (const store of app.stores) used.add(store === "google" ? "Play" : "iOS");
  }
  return COLUMNS.filter((c) => used.has(c));
}

/** Issues include every alert, which puts the app on the attention list too. */
export function matchesFilter(app: AppSummary, filter: AppFilter | null): boolean {
  if (!filter) return true;
  if (filter === "google" || filter === "apple") return app.stores.includes(filter);
  if (filter === "issue" && app.alerts.length > 0) return true;
  return app.attention.some((a) => a.category === filter);
}

/** One summary per app, in the order of the groups. */
export function summarizeApps(
  groups: AppGroup[],
  releasesByGroup: ReleasesByGroup | undefined,
  now = Date.now()
): AppSummary[] {
  return groups.map((group): AppSummary => {
    const stores: Store[] = [];
    if (group.google) stores.push("google");
    if (group.apple) stores.push("apple");

    const read = releasesByGroup?.[group.id] ?? {};
    const releases: AppSummary["releases"] = {};
    const lanes: Lane[] = [];
    const attention: Attention[] = [];
    const alerts: Alert[] = [];
    let newestUpload = 0;

    for (const store of stores) {
      const result = read[store];
      if (!result) continue;
      if ("error" in result) {
        alerts.push({
          key: `error:${store}`,
          tone: "red",
          store,
          label: "Not loaded",
          reason: result.error,
        });
        continue;
      }
      const latest = filterLatestReleases(result.releases);
      releases[store] = latest;
      for (const lane of lanesOf(store, latest)) {
        lanes.push(lane.lane);
        attention.push(...lane.attention);
      }
      if (store === "apple") {
        const testFlight = testFlightAlert(latest, now);
        if (testFlight) alerts.push(testFlight);
      }
      newestUpload = Math.max(newestUpload, ...result.releases.map(uploadedAt));
    }

    return {
      group,
      stores,
      loading: !releasesByGroup,
      releases,
      lanes,
      attention,
      alerts: alerts.sort((a, b) => Number(a.tone !== "red") - Number(b.tone !== "red")),
      needsAttention: attention.length > 0 || alerts.length > 0,
      isDev: DEV_NAME.test(group.name),
      dateLabel: newestUpload ? `Last upload ${formatDate(newestUpload)}` : null,
    };
  });
}
