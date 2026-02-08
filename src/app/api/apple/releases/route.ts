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
    const response = await appleApiFetch(
      `/v1/apps/${appId}/appStoreVersions?limit=10`
    );
    const data = await response.json();

    const PLATFORM_LABELS: Record<string, string> = {
      IOS: "iOS",
      MAC_OS: "macOS",
      TV_OS: "tvOS",
      VISION_OS: "visionOS",
    };

    const allVersions = data.data
      .filter((version: any) =>
        !platformFilter || platformFilter.includes(version.attributes.platform)
      );

    const releases: NormalizedRelease[] = allVersions.map((version: any) => {
      const state = version.attributes.appStoreState;
      const platform = version.attributes.platform;
      const mapped = STATUS_MAP[state] ?? { label: state, category: "pending" as const };
      return {
        store: "apple" as const,
        version: version.attributes.versionString,
        track: PLATFORM_LABELS[platform] ?? platform,
        status: mapped.label,
        statusCategory: mapped.category,
      };
    });

    return NextResponse.json(releases);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch releases" },
      { status: 500 }
    );
  }
}
