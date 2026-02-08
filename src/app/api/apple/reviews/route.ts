import { NextRequest, NextResponse } from "next/server";
import { appleApiFetch } from "@/lib/apple/client";
import { NormalizedReview } from "@/lib/types";

export async function GET(request: NextRequest) {
  const appId = request.nextUrl.searchParams.get("appId");

  if (!appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

  try {
    const response = await appleApiFetch(
      `/v1/apps/${appId}/customerReviews?sort=-createdDate&limit=50`
    );
    const data = await response.json();

    const reviews: NormalizedReview[] = data.data.map((review: any) => ({
      id: review.id,
      store: "apple" as const,
      rating: review.attributes.rating,
      title: review.attributes.title,
      body: review.attributes.body,
      author: review.attributes.reviewerNickname,
      date: review.attributes.createdDate,
    }));

    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
