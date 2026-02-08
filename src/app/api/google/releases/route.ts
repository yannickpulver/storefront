import { NextRequest, NextResponse } from "next/server";
import { getAndroidPublisher } from "@/lib/google/client";
import { NormalizedRelease } from "@/lib/types";

function mapStatusToCategory(status?: string | null): NormalizedRelease["statusCategory"] {
  if (!status) return "draft";

  switch (status) {
    case "completed":
      return "live";
    case "inProgress":
      return "pending";
    case "halted":
      return "issue";
    case "draft":
      return "draft";
    default:
      return "draft";
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const packageName = searchParams.get("packageName");

    if (!packageName) {
      return NextResponse.json(
        { error: "packageName query parameter is required" },
        { status: 400 }
      );
    }

    const androidPublisher = getAndroidPublisher();

    // Create an edit to access tracks
    const editResponse = await androidPublisher.edits.insert({
      packageName,
    });

    const editId = editResponse.data.id;

    if (!editId) {
      throw new Error("Failed to create edit");
    }

    // List tracks
    const tracksResponse = await androidPublisher.edits.tracks.list({
      packageName,
      editId,
    });

    // Delete the edit
    await androidPublisher.edits.delete({
      packageName,
      editId,
    });

    const releases: NormalizedRelease[] = [];

    for (const track of tracksResponse.data.tracks || []) {
      const trackName = track.track || "unknown";

      for (const release of track.releases || []) {
        releases.push({
          store: "google",
          version: release.name || release.versionCodes?.[0]?.toString() || "unknown",
          track: trackName,
          status: release.status || "draft",
          statusCategory: mapStatusToCategory(release.status),
        });
      }
    }

    return NextResponse.json(releases);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch releases" },
      { status: 500 }
    );
  }
}
