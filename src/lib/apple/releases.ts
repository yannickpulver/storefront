import { allPages, type AppleFetcher } from "./client";
import { PLATFORM_LABELS } from "./platforms";
import type { NormalizedRelease, Rollout, StatusCategory } from "@/lib/types";

interface AppStoreVersion {
  id: string;
  attributes: { versionString: string; platform: string; appStoreState: string };
  relationships?: {
    build?: { data?: { id: string } | null };
    appStoreVersionPhasedRelease?: { data?: { id: string } | null };
  };
}

interface AppStoreBuild {
  type: "builds";
  id: string;
  attributes: { version: string; uploadedDate?: string };
}

interface PhasedRelease {
  type: "appStoreVersionPhasedReleases";
  id: string;
  attributes: { phasedReleaseState: string; currentDayNumber?: number };
}

interface AppStoreResponse {
  data: AppStoreVersion[];
  included?: (AppStoreBuild | PhasedRelease)[];
  links?: { next?: string };
}

interface BuildData {
  id: string;
  attributes: { version: string; uploadedDate?: string; expirationDate?: string };
  relationships?: {
    buildBetaDetail?: { data?: { id: string } };
    preReleaseVersion?: { data?: { id: string } };
  };
}

interface IncludedResource {
  type: string;
  id: string;
  attributes: Record<string, string>;
}

interface BuildsResponse {
  data: BuildData[];
  included?: IncludedResource[];
  links?: { next?: string };
}

function mapAppleStatus(state: string): StatusCategory {
  switch (state) {
    case "READY_FOR_SALE":
    case "READY_FOR_DISTRIBUTION":
      return "live";
    case "IN_REVIEW":
    case "WAITING_FOR_REVIEW":
      return "review";
    case "REJECTED":
    case "METADATA_REJECTED":
    case "INVALID_BINARY":
    case "DEVELOPER_REJECTED":
    case "REMOVED_FROM_SALE":
    case "DEVELOPER_REMOVED_FROM_SALE":
      return "issue";
    case "PREPARE_FOR_SUBMISSION":
      return "draft";
    default:
      return "pending";
  }
}

function mapTestFlightStatus(state: string): StatusCategory {
  switch (state) {
    case "IN_BETA_TESTING":
      return "live";
    case "IN_BETA_REVIEW":
    case "WAITING_FOR_BETA_REVIEW":
    case "IN_EXPORT_COMPLIANCE_REVIEW":
      return "review";
    case "PROCESSING":
    case "READY_FOR_BETA_TESTING":
    case "READY_FOR_BETA_SUBMISSION":
    case "BETA_APPROVED":
      return "pending";
    case "BETA_REJECTED":
    case "EXPIRED":
    case "MISSING_EXPORT_COMPLIANCE":
    case "PROCESSING_EXCEPTION":
      return "issue";
    default:
      return "draft";
  }
}

// Share of users with automatic updates that Apple serves on each day of a phased release.
const PHASED_RELEASE_SHARES = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];

/** A phased release that has not finished; a completed one reaches every user. */
function phasedRollout(phased: PhasedRelease["attributes"] | undefined): Rollout | undefined {
  const share = (day?: number) => (day ? (PHASED_RELEASE_SHARES[day - 1] ?? null) : null);
  switch (phased?.phasedReleaseState) {
    case "INACTIVE":
      return { state: "planned", fraction: null };
    case "ACTIVE":
      return { state: "active", fraction: share(phased.currentDayNumber) };
    case "PAUSED":
      return { state: "paused", fraction: share(phased.currentDayNumber) };
    default:
      return undefined;
  }
}

/**
 * Every App Store version of the app. The endpoint has no sort, so only reading all of them
 * guarantees the newest is among them; one page holds every version of nearly every app.
 */
async function fetchAppStoreVersions(
  fetcher: AppleFetcher,
  appId: string,
  platforms?: string[]
): Promise<NormalizedRelease[]> {
  const filterPlatform = platforms?.length ? `&filter[platform]=${platforms.join(",")}` : "";
  const pages = await allPages<AppStoreResponse>(
    fetcher,
    `/apps/${appId}/appStoreVersions?limit=200&include=build,appStoreVersionPhasedRelease&fields[builds]=version,uploadedDate&fields[appStoreVersionPhasedReleases]=phasedReleaseState,currentDayNumber${filterPlatform}`
  );

  // JSON:API identifies an included resource by type and id together.
  const included = pages.flatMap((page) => page.included ?? []);
  const builds = new Map(
    included.flatMap((r) => (r.type === "builds" ? [[r.id, r.attributes] as const] : []))
  );
  const phasedReleases = new Map(
    included.flatMap((r) =>
      r.type === "appStoreVersionPhasedReleases" ? [[r.id, r.attributes] as const] : []
    )
  );

  return pages
    .flatMap((page) => page.data)
    .map((version) => {
      const buildId = version.relationships?.build?.data?.id;
      const build = buildId ? builds.get(buildId) : undefined;
      const phasedId = version.relationships?.appStoreVersionPhasedRelease?.data?.id;
      const rollout = phasedRollout(phasedId ? phasedReleases.get(phasedId) : undefined);
      const { platform, appStoreState, versionString } = version.attributes;
      return {
        store: "apple" as const,
        id: version.id,
        version: versionString,
        versionCode: build?.version,
        track: PLATFORM_LABELS[platform] ?? platform,
        status: appStoreState,
        statusCategory: mapAppleStatus(appStoreState),
        platform,
        publishedAt: build?.uploadedDate,
        ...(rollout ? { rollout } : {}),
      };
    });
}

// External testing states that put a build on the external track; a build never submitted for
// external testing has none of them.
const EXTERNAL_ACTIVE = [
  "IN_BETA_TESTING",
  "IN_BETA_REVIEW",
  "WAITING_FOR_BETA_REVIEW",
  "BETA_APPROVED",
  "READY_FOR_BETA_TESTING",
  "IN_EXPORT_COMPLIANCE_REVIEW",
  "BETA_REJECTED",
];

/** Every valid TestFlight build that has not expired, on the internal and external track. */
async function fetchTestFlightBuilds(
  fetcher: AppleFetcher,
  appId: string
): Promise<NormalizedRelease[]> {
  const pages = await allPages<BuildsResponse>(
    fetcher,
    `/builds?filter[app]=${appId}&filter[processingState]=VALID&filter[expired]=false&sort=-uploadedDate&limit=200&include=buildBetaDetail,preReleaseVersion`
  );

  const included = new Map(
    pages.flatMap((page) => page.included ?? []).map((r) => [`${r.type}:${r.id}`, r.attributes])
  );

  return pages
    .flatMap((page) => page.data)
    .flatMap((build) => {
      const beta = included.get(`buildBetaDetails:${build.relationships?.buildBetaDetail?.data?.id}`);
      const preRelease = included.get(
        `preReleaseVersions:${build.relationships?.preReleaseVersion?.data?.id}`
      );
      if (!beta || !preRelease) return [];

      const base = {
        store: "apple" as const,
        version: preRelease.version,
        versionCode: build.attributes.version,
        platform: preRelease.platform,
        publishedAt: build.attributes.uploadedDate,
        expiresAt: build.attributes.expirationDate
          ? new Date(build.attributes.expirationDate).toISOString()
          : undefined,
      };
      const releases: NormalizedRelease[] = [];
      const internal = beta.internalBuildState;
      if (internal && internal !== "PROCESSING_EXCEPTION") {
        releases.push({
          ...base,
          track: "TestFlight (Internal)",
          status: internal,
          statusCategory: mapTestFlightStatus(internal),
        });
      }
      const external = beta.externalBuildState;
      if (external && EXTERNAL_ACTIVE.includes(external)) {
        releases.push({
          ...base,
          track: "TestFlight (External)",
          status: external,
          statusCategory: mapTestFlightStatus(external),
        });
      }
      return releases;
    });
}

/** App Store versions and TestFlight builds, limited to the given platforms. */
export async function fetchAppleReleases(
  fetcher: AppleFetcher,
  appId: string,
  platforms?: string[]
): Promise<NormalizedRelease[]> {
  const [versions, builds] = await Promise.all([
    fetchAppStoreVersions(fetcher, appId, platforms),
    fetchTestFlightBuilds(fetcher, appId),
  ]);
  const matchesPlatform = (r: NormalizedRelease) =>
    !platforms?.length || !r.platform || platforms.includes(r.platform);
  return [...versions, ...builds.filter(matchesPlatform)];
}

/** Publishes an App Store version that waits for the developer to release it. */
export async function releaseAppStoreVersion(fetcher: AppleFetcher, versionId: string): Promise<void> {
  await fetcher.post("/appStoreVersionReleaseRequests", {
    data: {
      type: "appStoreVersionReleaseRequests",
      relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: versionId } } },
    },
  });
}
