import { NextRequest, NextResponse } from "next/server";
import gplay from "google-play-scraper";
import type { NormalizedReview } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const packageName = request.nextUrl.searchParams.get("packageName");

    if (!packageName) {
      return NextResponse.json(
        { error: "packageName query parameter is required" },
        { status: 400 }
      );
    }

    const result = await gplay.reviews({
      appId: packageName,
      sort: 2, // NEWEST
      num: 50,
    });

    const reviews: NormalizedReview[] = result.data.map((r) => ({
      id: r.id,
      store: "google" as const,
      rating: r.score,
      title: r.title || undefined,
      body: r.text,
      author: r.userName,
      date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json(reviews);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
