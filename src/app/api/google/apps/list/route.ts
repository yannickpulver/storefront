import { NextResponse } from "next/server";
import { getPlayDeveloperReporting } from "@/lib/google/client";
import { listGoogleApps } from "@/lib/google/apps";

export async function GET() {
  try {
    const reporting = await getPlayDeveloperReporting();
    return NextResponse.json({ apps: await listGoogleApps(reporting) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list apps" }, { status: 500 });
  }
}
