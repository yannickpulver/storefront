import { NextRequest, NextResponse } from "next/server";
import { getPlayDeveloperReporting } from "@/lib/google/client";
import { fetchGoogleVitals } from "@/lib/google/vitals";

export async function GET(request: NextRequest) {
  const packageName = request.nextUrl.searchParams.get("packageName");
  if (!packageName) {
    return NextResponse.json({ error: "packageName query parameter is required" }, { status: 400 });
  }

  try {
    const reporting = await getPlayDeveloperReporting();
    return NextResponse.json(await fetchGoogleVitals(reporting, packageName));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch vitals" }, { status: 500 });
  }
}
