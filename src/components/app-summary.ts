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

export interface AppSummary {
  group: AppGroup;
  stores: Store[];
  /** A store's releases have not arrived yet. */
  loading: boolean;
  /** The releases worth showing per store. */
  releases: Partial<Record<Store, NormalizedRelease[]>>;
  /** Release shown in the list row per store: the live one, else the newest that is not a draft. */
  current: Partial<Record<Store, NormalizedRelease | null>>;
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

function attentionOf(store: Store, latest: NormalizedRelease[]): Attention[] {
  const storeReleases = latest.filter((r) => !isTestFlight(r));
  return ATTENTION_ORDER.flatMap((category) => {
    const release = storeReleases.find((r) => r.statusCategory === category);
    return release ? [{ store, category, release }] : [];
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
    const current: AppSummary["current"] = {};
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
      current[store] =
        latest.find((r) => r.statusCategory === "live") ??
        latest.find((r) => r.statusCategory !== "draft") ??
        latest[0] ??
        null;
      attention.push(...attentionOf(store, latest));
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
      current,
      attention,
      alerts: alerts.sort((a, b) => Number(a.tone !== "red") - Number(b.tone !== "red")),
      needsAttention: attention.length > 0 || alerts.length > 0,
      isDev: DEV_NAME.test(group.name),
      dateLabel: newestUpload ? `Last upload ${formatDate(newestUpload)}` : null,
    };
  });
}
