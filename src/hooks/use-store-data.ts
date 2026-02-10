"use client";

import useSWR from "swr";
import type { NormalizedReview, NormalizedRelease } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) return r.json().then((d) => Promise.reject(d));
    return r.json();
  });

export function useGoogleApps(enabled = true) {
  return useSWR<{ packageName: string; displayName: string }[]>(
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

export function useGoogleReleases(packageName?: string) {
  return useSWR<NormalizedRelease[]>(
    packageName ? `/api/google/releases?packageName=${packageName}` : null,
    fetcher
  );
}

export function useAppleApps(enabled = true) {
  return useSWR<{ appId: string; name: string; bundleId: string }[]>(
    enabled ? "/api/apple/apps" : null,
    fetcher
  );
}

export function useAppleReviews(appId?: string) {
  return useSWR<NormalizedReview[]>(
    appId ? `/api/apple/reviews?appId=${appId}` : null,
    fetcher
  );
}

export function useAppleReleases(appId?: string, platforms?: string[]) {
  const params = appId
    ? `/api/apple/releases?appId=${appId}${platforms?.length ? `&platforms=${platforms.join(",")}` : ""}`
    : null;
  return useSWR<NormalizedRelease[]>(params, fetcher);
}
