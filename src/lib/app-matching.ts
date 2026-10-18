import type { AppleApp } from "@/lib/apple/apps";
import type { GoogleApp } from "@/lib/google/apps";
import type { AppGroup } from "@/lib/types";

export interface AppPair {
  google: GoogleApp;
  apple: AppleApp;
  /** A group that holds one of the two apps and gets the other one added. */
  existingGroupId?: string;
  /** Similarity of a proposed match, from 0 to 1; absent for an exact match. */
  score?: number;
}

export type SingleApp = { store: "google"; app: GoogleApp } | { store: "apple"; app: AppleApp };

export interface MatchResult {
  /** Package name equals bundle ID. */
  matched: AppPair[];
  /** Likely the same app, by bundle ID prefix and name. */
  fuzzyMatched: AppPair[];
  singleRegular: SingleApp[];
  singleInternal: SingleApp[];
}

const FUZZY_THRESHOLD = 0.7;
const INTERNAL_KEYWORDS = ["staging", "internal", "testing", "beta", "devtesting", "dev", "demo"];
const NAME_STOPWORDS = new Set(["app", "apps", "the", "for", "and", "by"]);

export function isInternalApp(single: SingleApp): boolean {
  const [name, id] =
    single.store === "google"
      ? [single.app.displayName, single.app.packageName]
      : [single.app.name, single.app.bundleId];
  return INTERNAL_KEYWORDS.some(
    (kw) => name.toLowerCase().includes(kw) || id.toLowerCase().includes(kw)
  );
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NAME_STOPWORDS.has(w))
    .join(" ");
}

function bundleIdPrefixScore(id1: string, id2: string): number {
  const a = id1.toLowerCase();
  const b = id2.toLowerCase();
  if (a.startsWith(b) || b.startsWith(a)) return 1.0;
  const partsA = a.split(".");
  const partsB = b.split(".");
  let shared = 0;
  while (shared < Math.min(partsA.length, partsB.length) && partsA[shared] === partsB[shared]) {
    shared++;
  }
  return shared / Math.max(partsA.length, partsB.length);
}

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] =
        a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[b.length];
}

function nameSimilarityScore(name1: string, name2: string): number {
  const a = normalizeName(name1);
  const b = normalizeName(name2);
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.9;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

// 60% bundle-ID prefix similarity (same reverse-domain convention across stores),
// 40% normalized name similarity (display names often differ slightly).
function fuzzyMatchScore(google: GoogleApp, apple: AppleApp): number {
  return (
    0.6 * bundleIdPrefixScore(google.packageName, apple.bundleId) +
    0.4 * nameSimilarityScore(google.displayName, apple.name)
  );
}

/**
 * Proposes groups for every app not yet on the dashboard: exact pairs (package name equals
 * bundle ID, also completing a group that holds one side), likely pairs, and single apps.
 */
export function computeMatches(
  googleApps: GoogleApp[],
  appleApps: AppleApp[],
  groups: AppGroup[]
): MatchResult {
  const groupedGoogle = new Map(groups.flatMap((g) => (g.google ? [[g.google.packageName, g]] : [])));
  const groupedApple = new Map(groups.flatMap((g) => (g.apple ? [[g.apple.appId, g]] : [])));
  const appleByBundleId = new Map(appleApps.map((a) => [a.bundleId, a]));

  const usedGoogle = new Set<string>();
  const usedApple = new Set<string>();
  const take = (pair: AppPair) => {
    usedGoogle.add(pair.google.packageName);
    usedApple.add(pair.apple.appId);
  };

  const matched: AppPair[] = [];
  for (const google of googleApps) {
    const apple = appleByBundleId.get(google.packageName);
    if (!apple) continue;
    const googleGroup = groupedGoogle.get(google.packageName);
    const appleGroup = groupedApple.get(apple.appId);
    // Both already on the dashboard, or in two different groups: nothing to propose.
    if (googleGroup && appleGroup) continue;
    const existing = googleGroup ?? appleGroup;
    if (existing && (googleGroup ? existing.apple : existing.google)) continue;
    const pair = { google, apple, existingGroupId: existing?.id };
    take(pair);
    matched.push(pair);
  }

  const freeGoogle = googleApps.filter(
    (a) => !usedGoogle.has(a.packageName) && !groupedGoogle.has(a.packageName)
  );
  const freeApple = appleApps.filter((a) => !usedApple.has(a.appId) && !groupedApple.has(a.appId));

  // Likely pairs among the apps on neither the dashboard nor an exact pair, best score first.
  const candidates = freeGoogle
    .flatMap((google) => freeApple.map((apple) => ({ google, apple, score: fuzzyMatchScore(google, apple) })))
    .filter((p) => p.score >= FUZZY_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  const fuzzyMatched: AppPair[] = [];
  for (const pair of candidates) {
    if (usedGoogle.has(pair.google.packageName) || usedApple.has(pair.apple.appId)) continue;
    take(pair);
    fuzzyMatched.push(pair);
  }

  const singles: SingleApp[] = [
    ...freeGoogle
      .filter((app) => !usedGoogle.has(app.packageName))
      .map((app) => ({ store: "google" as const, app })),
    ...freeApple
      .filter((app) => !usedApple.has(app.appId))
      .map((app) => ({ store: "apple" as const, app })),
  ];

  return {
    matched,
    fuzzyMatched,
    singleRegular: singles.filter((s) => !isInternalApp(s)),
    singleInternal: singles.filter(isInternalApp),
  };
}
