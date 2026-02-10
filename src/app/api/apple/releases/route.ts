import { NextRequest, NextResponse } from "next/server";
import { appleApiFetch } from "@/lib/apple/client";
import { NormalizedRelease } from "@/lib/types";

const STATUS_MAP: Record<string, { label: string; category: NormalizedRelease["statusCategory"] }> = {
  READY_FOR_SALE: { label: "Live", category: "live" },
  PROCESSING_FOR_APP_STORE: { label: "Processing", category: "pending" },
  PENDING_DEVELOPER_RELEASE: { label: "Pending release", category: "pending" },
  PENDING_APPLE_RELEASE: { label: "Pending release", category: "pending" },
  IN_REVIEW: { label: "In review", category: "review" },
  WAITING_FOR_REVIEW: { label: "Waiting for review", category: "review" },
  ACCEPTED: { label: "Accepted", category: "pending" },
  READY_FOR_REVIEW: { label: "Ready for review", category: "review" },
  REJECTED: { label: "Rejected", category: "issue" },
  DEVELOPER_REJECTED: { label: "Rejected", category: "issue" },
  METADATA_REJECTED: { label: "Metadata rejected", category: "issue" },
  REMOVED_FROM_SALE: { label: "Removed", category: "issue" },
  INVALID_BINARY: { label: "Invalid binary", category: "issue" },
  PREPARE_FOR_SUBMISSION: { label: "Draft", category: "draft" },
  DEVELOPER_REMOVED_FROM_SALE: { label: "Removed", category: "draft" },
  REPLACED_WITH_NEW_VERSION: { label: "Replaced", category: "draft" },
};

export async function GET(request: NextRequest) {
  const appId = request.nextUrl.searchParams.get("appId");
  const platformsParam = request.nextUrl.searchParams.get("platforms");
  const platformFilter = platformsParam ? platformsParam.split(",") : null;

  if (!appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

  try {
    const PLATFORM_LABELS: Record<string, string> = {
      IOS: "iOS",
      MAC_OS: "macOS",
      TV_OS: "tvOS",
      VISION_OS: "visionOS",
    };

    const [storeResponse, latestBuildResponse, externalBuildResponse] = await Promise.all([
      appleApiFetch(`/v1/apps/${appId}/appStoreVersions?limit=10&include=build&fields[builds]=version&fields[appStoreVersions]=versionString,platform,appStoreState,build`),
      appleApiFetch(`/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=1&fields[builds]=version,uploadedDate,processingState&include=preReleaseVersion,betaAppReviewSubmission&fields[preReleaseVersions]=version&fields[betaAppReviewSubmissions]=betaReviewState`),
      appleApiFetch(`/v1/builds?filter[app]=${appId}&filter[betaAppReviewSubmission.betaReviewState]=APPROVED&sort=-uploadedDate&limit=1&fields[builds]=version,processingState&include=preReleaseVersion&fields[preReleaseVersions]=version`),
    ]);

    const storeData = await storeResponse.json();
    const latestBuildData = await latestBuildResponse.json();
    const externalBuildData = await externalBuildResponse.json();

    const includedBuilds = new Map<string, string>();
    for (const inc of storeData.included ?? []) {
      if (inc.type === "builds") {
        includedBuilds.set(inc.id, inc.attributes.version);
      }
    }

    const allVersions = storeData.data
      .filter((version: any) =>
        !platformFilter || platformFilter.includes(version.attributes.platform)
      );

    const releases: NormalizedRelease[] = allVersions.map((version: any) => {
      const state = version.attributes.appStoreState;
      const platform = version.attributes.platform;
      const mapped = STATUS_MAP[state] ?? { label: state, category: "pending" as const };
      const buildId = version.relationships?.build?.data?.id;
      const buildNumber = buildId ? includedBuilds.get(buildId) : undefined;
      return {
        store: "apple" as const,
        version: version.attributes.versionString,
        track: PLATFORM_LABELS[platform] ?? platform,
        status: mapped.label,
        statusCategory: mapped.category,
        ...(buildNumber ? { versionCode: buildNumber } : {}),
      };
    });

    // Latest build (internal)
    if (latestBuildData.data?.length > 0) {
      const build = latestBuildData.data[0];
      const processing = build.attributes.processingState;
      const isProcessing = processing !== "VALID";
      const preReleaseVersion = latestBuildData.included?.find(
        (inc: any) => inc.type === "preReleaseVersions"
      );
      const reviewSubmission = latestBuildData.included?.find(
        (inc: any) => inc.type === "betaAppReviewSubmissions"
      );
      const reviewState = reviewSubmission?.attributes?.betaReviewState;

      let status = "Processing";
      let statusCategory: NormalizedRelease["statusCategory"] = "pending";
      if (!isProcessing) {
        if (reviewState === "APPROVED") {
          status = "External";
          statusCategory = "live";
        } else if (reviewState === "IN_REVIEW" || reviewState === "WAITING_FOR_REVIEW") {
          status = "In review";
          statusCategory = "review";
        } else {
          status = "Internal";
          statusCategory = "live";
        }
      }

      const marketingVersion = preReleaseVersion?.attributes?.version;
      const buildNumber = build.attributes.version;
      releases.push({
        store: "apple" as const,
        version: marketingVersion ?? buildNumber,
        versionCode: buildNumber,
        track: "TestFlight",
        status,
        statusCategory,
      });
    }

    // Latest external build (if different from latest)
    if (externalBuildData.data?.length > 0) {
      const extBuild = externalBuildData.data[0];
      const latestBuildId = latestBuildData.data?.[0]?.id;
      if (extBuild.id !== latestBuildId) {
        const preReleaseVersion = externalBuildData.included?.find(
          (inc: any) => inc.type === "preReleaseVersions"
        );
        const marketingVersion = preReleaseVersion?.attributes?.version;
        const buildNumber = extBuild.attributes.version;
        releases.push({
          store: "apple" as const,
          version: marketingVersion ?? buildNumber,
          versionCode: buildNumber,
          track: "TestFlight (External)",
          status: "External",
          statusCategory: "live",
        });
      }
    }

    return NextResponse.json(releases);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch releases" },
      { status: 500 }
    );
  }
}
