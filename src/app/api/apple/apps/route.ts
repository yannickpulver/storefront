import { NextResponse } from "next/server";
import { appleApiFetch } from "@/lib/apple/client";

export async function GET() {
  try {
    const response = await appleApiFetch(
      "/v1/apps?fields[apps]=name,bundleId"
    );
    const data = await response.json();

    const apps = data.data.map((app: any) => ({
      appId: app.id,
      name: app.attributes.name,
      bundleId: app.attributes.bundleId,
    }));

    return NextResponse.json(apps);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch apps" },
      { status: 500 }
    );
  }
}
