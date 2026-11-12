import { NextRequest, NextResponse } from "next/server";
import { getAppleFetcher } from "@/lib/apple/client";
import { releaseAppStoreVersion } from "@/lib/apple/releases";

/** Releases an App Store version in "Pending Developer Release"; Apple refuses any other state. */
export async function POST(request: NextRequest) {
  try {
    const { versionId } = await request.json();
    if (typeof versionId !== "string" || !versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }
    await releaseAppStoreVersion(await getAppleFetcher(), versionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to release version" },
      { status: 500 }
    );
  }
}
