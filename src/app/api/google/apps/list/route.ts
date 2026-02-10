import { NextResponse } from "next/server";
import { getPlayDeveloperReporting } from "@/lib/google/client";

export async function GET() {
  try {
    const reporting = await getPlayDeveloperReporting();

    const response = await reporting.apps.search({
      pageSize: 100,
    });

    const apps = (response.data.apps ?? []).map((app) => ({
      packageName: app.packageName,
      displayName: app.displayName,
    }));

    return NextResponse.json({ apps });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list apps" },
      { status: 500 }
    );
  }
}
