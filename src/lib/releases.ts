import type { NormalizedRelease } from "@/lib/types";

export type Store = "google" | "apple";

/** What the dashboard read from one store for one app. */
export type StoreResult = { releases: NormalizedRelease[] } | { error: string };

export type ReleasesByGroup = Record<string, Partial<Record<Store, StoreResult>>>;

const HIDDEN_STATUSES = ["REPLACED_WITH_NEW_VERSION", "DEVELOPER_REMOVED_FROM_SALE"];

/** Hides removed releases and empty Google releases (no name, no build). */
function isVisibleRelease(r: NormalizedRelease): boolean {
  if (HIDDEN_STATUSES.includes(r.status)) return false;
  return r.store !== "google" || !!r.versionCode;
}

export const isTestFlight = (r: NormalizedRelease) => r.track.startsWith("TestFlight");

const compareNumeric = (a?: string, b?: string) =>
  (a ?? "").localeCompare(b ?? "", undefined, { numeric: true });

/** Highest version first, then highest build number. */
function newestFirst(a: NormalizedRelease, b: NormalizedRelease): number {
  return compareNumeric(b.version, a.version) || compareNumeric(b.versionCode, a.versionCode);
}

const GOOGLE_TRACK_ORDER = ["production", "beta", "alpha", "internal"];
const APPLE_PLATFORM_ORDER = ["iOS", "macOS", "tvOS", "visionOS"];
const orderOf = (order: string[], value: string) => order.indexOf(value) >>> 0;

/**
 * The releases worth showing. Google: per track the releases it holds; during a staged rollout
 * it serves two live ones, the one rolling out first. Apple: per platform the newest draft,
 * non-live and live version, plus the newest build of each TestFlight track.
 */
export function filterLatestReleases(releases: NormalizedRelease[]): NormalizedRelease[] {
  const visible = releases.filter(isVisibleRelease).sort(newestFirst);
  if (visible.length === 0) return [];

  if (visible[0].store === "google") {
    const result: NormalizedRelease[] = [];
    for (const track of new Set(visible.map((r) => r.track))) {
      const rows = visible.filter((r) => r.track === track);
      const published = rows.filter((r) => r.statusCategory !== "draft");
      result.push(...published.filter((r) => r.statusCategory !== "live"));
      result.push(...published.filter((r) => r.statusCategory === "live"));
      const draft = rows.find((r) => r.statusCategory === "draft");
      if (draft && !published.some((r) => r.version === draft.version)) result.push(draft);
    }
    return result.sort(
      (a, b) =>
        orderOf(GOOGLE_TRACK_ORDER, a.track) - orderOf(GOOGLE_TRACK_ORDER, b.track)
    );
  }

  const byPlatform = new Map<string, { draft?: NormalizedRelease; nonLive?: NormalizedRelease; live?: NormalizedRelease }>();
  const testFlight = new Map<string, NormalizedRelease>();
  for (const r of visible) {
    if (isTestFlight(r)) {
      if (!testFlight.has(r.track)) testFlight.set(r.track, r);
      continue;
    }
    const entry = byPlatform.get(r.track) ?? {};
    const slot = r.statusCategory === "draft" ? "draft" : r.statusCategory === "live" ? "live" : "nonLive";
    entry[slot] ??= r;
    byPlatform.set(r.track, entry);
  }

  const platforms = [...byPlatform.entries()].sort(
    (a, b) => orderOf(APPLE_PLATFORM_ORDER, a[0]) - orderOf(APPLE_PLATFORM_ORDER, b[0])
  );
  const result: NormalizedRelease[] = [];
  for (const [, { draft, nonLive, live }] of platforms) {
    if (draft) result.push(draft);
    if (nonLive) result.push(nonLive);
    if (live) result.push(live);
  }
  return [...result, ...testFlight.values()];
}

/** "1705939357 (1.2.0)" → "1.2.0": drops a leading version code from a Google release name. */
export function stripVersionCode(version: string, versionCode?: string): string {
  if (!versionCode) return version;
  const pattern = new RegExp(`^${versionCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(?`);
  if (!pattern.test(version)) return version;
  return version.replace(pattern, "").replace(/\)\s*$/, "").trim() || version;
}

const DAY_MS = 86_400_000;

// Testers lose a build when it expires, so its last week stands out.
const EXPIRY_WARNING_DAYS = 7;

/** "expires in 12d" for a TestFlight build, "expired" once past; null outside TestFlight. */
export function testFlightExpiry(
  r: NormalizedRelease,
  now = Date.now()
): { text: string; warn: boolean } | null {
  if (!isTestFlight(r) || !r.expiresAt) return null;
  const days = Math.floor((Date.parse(r.expiresAt) - now) / DAY_MS);
  if (days < 0) return { text: "expired", warn: true };
  return { text: `expires in ${days}d`, warn: days <= EXPIRY_WARNING_DAYS };
}

const percent = (fraction: number) => `${Math.round(fraction * 1000) / 10} %`;

/** "20 % rollout" while a staged rollout widens, "paused at 5 %" (Google: "halted") once stopped. */
export function rolloutProgress(r: NormalizedRelease): { text: string; warn: boolean } | null {
  const { state, fraction } = r.rollout ?? {};
  if (state === "planned") return { text: "phased release planned", warn: false };
  if ((state !== "active" && state !== "paused") || fraction == null) return null;
  if (state === "active") return { text: `${percent(fraction)} rollout`, warn: false };
  const stopped = r.store === "google" ? "halted" : "paused";
  return { text: `${stopped} at ${percent(fraction)}`, warn: true };
}

const APPLE_PLATFORM_PATHS: Record<string, string> = {
  IOS: "ios",
  MAC_OS: "macos",
  TV_OS: "tvos",
  VISION_OS: "visionos",
};

/**
 * App Store Connect page of a release: the TestFlight builds, the live version ("deliverable")
 * or the version in progress ("inflight").
 */
export function appStoreConnectUrl(r: NormalizedRelease, appId: string): string {
  const platform = APPLE_PLATFORM_PATHS[r.platform ?? ""] ?? "ios";
  const app = `https://appstoreconnect.apple.com/apps/${appId}`;
  if (isTestFlight(r)) return `${app}/testflight/${platform}`;
  return `${app}/distribution/${platform}/version/${r.statusCategory === "live" ? "deliverable" : "inflight"}`;
}
