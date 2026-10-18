import { NextRequest, NextResponse } from "next/server";
import gplay from "google-play-scraper";
import { getAppleFetcher } from "@/lib/apple/client";
import { fetchLatestBuild } from "@/lib/apple/apps";

// Swiss store first: many apps are only listed there, and the lookup defaults to the US store.
const APPLE_COUNTRIES = ["ch", "us"];

async function lookupAppleIcon(appId: string): Promise<string | undefined> {
  for (const country of APPLE_COUNTRIES) {
    const res = await fetch(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${country}`,
      { signal: AbortSignal.timeout(10_000) }
    ).catch(() => null);
    const data = res?.ok ? await res.json() : null;
    const result = data?.results?.[0];
    const iconUrl = result?.artworkUrl512 ?? result?.artworkUrl100;
    if (iconUrl) return iconUrl;
  }
  // Apps without a store listing still carry an icon on their newest build.
  const fetcher = await getAppleFetcher();
  return (await fetchLatestBuild(fetcher, appId)).iconUrl;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get("store");
  const id = searchParams.get("id");

  if (!store || !id) {
    return NextResponse.json({ error: "store and id required" }, { status: 400 });
  }

  try {
    let iconUrl: string | undefined;

    if (store === "google") {
      const app = await gplay.app({ appId: id });
      iconUrl = app.icon;
    } else if (store === "apple") {
      iconUrl = await lookupAppleIcon(id);
    }

    if (!iconUrl) {
      return new NextResponse(null, { status: 404 });
    }

    return NextResponse.redirect(iconUrl, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
