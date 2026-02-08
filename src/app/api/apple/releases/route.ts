import { NextRequest, NextResponse } from "next/server";
import { appleApiFetch } from "@/lib/apple/client";
import { NormalizedRelease } from "@/lib/types";

const STATUS_MAP: Record<
  string,
  "live" | "review" | "pending" | "issue" | "draft"
> = {
  READY_FOR_SALE: "live",
  IN_REVIEW: "review",
  WAITING_FOR_REVIEW: "review",
  PENDING_DEVELOPER_RELEASE: "pending",
  PENDING_APPLE_RELEASE: "pending",
  REJECTED: "issue",
  DEVELOPER_REJECTED: "issue",
  REMOVED_FROM_SALE: "issue",
  INVALID_BINARY: "issue",
  PREPARE_FOR_SUBMISSION: "draft",
  DEVELOPER_REMOVED_FROM_SALE: "draft",
};

export async function GET(request: NextRequest) {
  const appId = request.nextUrl.searchParams.get("appId");

  if (!appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

  try {
    const response = await appleApiFetch(
      `/v1/apps/${appId}/appStoreVersions?limit=10`
    );
    const data = await response.json();

    const releases: NormalizedRelease[] = data.data.map((version: any) => {
      const status = version.attributes.appStoreState;
      return {
        store: "apple" as const,
        version: version.attributes.versionString,
        track: "App Store",
        status,
        statusCategory: STATUS_MAP[status] || "draft",
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
