import { NextRequest, NextResponse } from "next/server";
import { getAppleFetcher } from "@/lib/apple/client";
import { NormalizedReview } from "@/lib/types";

interface CustomerReviewsResponse {
  data: {
    id: string;
    attributes: {
      rating: number;
      title?: string;
      body?: string;
      reviewerNickname?: string;
      createdDate: string;
    };
  }[];
}

export async function GET(request: NextRequest) {
  const appId = request.nextUrl.searchParams.get("appId");

  if (!appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

  try {
    const fetcher = await getAppleFetcher();
    const data = await fetcher.get<CustomerReviewsResponse>(
      `/apps/${appId}/customerReviews?sort=-createdDate&limit=50`
    );

    const reviews: NormalizedReview[] = data.data.map((review) => ({
      id: review.id,
      store: "apple" as const,
      rating: review.attributes.rating,
      title: review.attributes.title,
      body: review.attributes.body ?? "",
      author: review.attributes.reviewerNickname ?? "",
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
