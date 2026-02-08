import { NextRequest, NextResponse } from "next/server";
import gplay from "google-play-scraper";

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
      const res = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      iconUrl = data.results?.[0]?.artworkUrl100;
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
