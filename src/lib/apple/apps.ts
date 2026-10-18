import { pool } from "@/lib/pool";
import { allPages, type AppleFetcher } from "./client";

export interface AppleApp {
  appId: string;
  name: string;
  bundleId: string;
  lastUploadAt?: string;
}

interface AppsResponse {
  data: { id: string; attributes: { name: string; bundleId: string } }[];
  links?: { next?: string };
}

interface LatestBuildResponse {
  data: { attributes: { uploadedDate?: string } }[];
  included?: { attributes: { iconType?: string; iconAsset?: { templateUrl?: string } } }[];
}

// Newest-build lookups in flight at once, so an account with many apps does not fire them all
// at the same moment.
const BUILD_LOOKUP_CONCURRENCY = 4;

/** Upload date and icon of the newest build. Works for apps without a store listing. */
export async function fetchLatestBuild(fetcher: AppleFetcher, appId: string) {
  const res = await fetcher.get<LatestBuildResponse>(
    `/builds?filter[app]=${appId}&sort=-uploadedDate&limit=1&fields[builds]=uploadedDate,icons&include=icons`
  );
  const uploadedDate = res.data[0]?.attributes.uploadedDate;
  const icon =
    res.included?.find((i) => i.attributes.iconType === "APP_STORE") ?? res.included?.[0];
  const template = icon?.attributes.iconAsset?.templateUrl;
  return {
    uploadedAt: uploadedDate ? new Date(uploadedDate).toISOString() : undefined,
    iconUrl: template?.replace("{w}", "512").replace("{h}", "512").replace("{f}", "png"),
  };
}

/** Every app of the account, with its last upload date. */
export async function listAppleApps(fetcher: AppleFetcher): Promise<AppleApp[]> {
  const pages = await allPages<AppsResponse>(fetcher, "/apps?limit=200&fields[apps]=name,bundleId");
  const apps = pages
    .flatMap((page) => page.data)
    .map((app) => ({ appId: app.id, name: app.attributes.name, bundleId: app.attributes.bundleId }));

  return pool(apps, BUILD_LOOKUP_CONCURRENCY, async (app) => {
    // Without its newest build an app still lists, only without an upload date.
    const build = await fetchLatestBuild(fetcher, app.appId).catch(() => null);
    return { ...app, lastUploadAt: build?.uploadedAt };
  });
}
