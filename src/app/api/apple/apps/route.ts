import { NextResponse } from "next/server";
import { getAppleFetcher } from "@/lib/apple/client";
import { listAppleApps } from "@/lib/apple/apps";

export async function GET() {
  try {
    const fetcher = await getAppleFetcher();
    return NextResponse.json(await listAppleApps(fetcher));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch apps" },
      { status: 500 }
    );
  }
}
