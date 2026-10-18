"use client";

import useSWR from "swr";
import type { AppleApp } from "@/lib/apple/apps";
import type { GoogleApp } from "@/lib/google/apps";
import type { ReleasesByGroup } from "@/lib/releases";
import type { AppVersionVitals, NormalizedReview } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) return r.json().then((d) => Promise.reject(d));
    return r.json();
  });

export const RELEASES_KEY = "/api/releases";

/** Every app's releases from both stores, read live. */
export function useReleases(enabled = true) {
  return useSWR<ReleasesByGroup>(enabled ? RELEASES_KEY : null, fetcher, {
    revalidateOnFocus: false,
  });
}

export function useGoogleApps(enabled = true) {
  return useSWR<GoogleApp[]>(
    enabled ? "/api/google/apps/list" : null,
    (url: string) => fetcher(url).then((d) => d.apps)
  );
}

export function useGoogleReviews(packageName?: string) {
  return useSWR<NormalizedReview[]>(
    packageName ? `/api/google/reviews?packageName=${packageName}` : null,
    fetcher
  );
}

export function useGoogleVitals(packageName?: string) {
  return useSWR<AppVersionVitals>(
    packageName ? `/api/google/vitals?packageName=${packageName}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useAppleApps(enabled = true) {
  return useSWR<AppleApp[]>(enabled ? "/api/apple/apps" : null, fetcher);
}

export function useAppleReviews(appId?: string) {
  return useSWR<NormalizedReview[]>(
    appId ? `/api/apple/reviews?appId=${appId}` : null,
    fetcher
  );
}
