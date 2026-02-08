import { NextRequest, NextResponse } from "next/server";
import { getAndroidPublisher } from "@/lib/google/client";
import { NormalizedReview } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const packageName = searchParams.get("packageName");

    if (!packageName) {
      return NextResponse.json(
        { error: "packageName query parameter is required" },
        { status: 400 }
      );
    }

    const androidPublisher = await getAndroidPublisher();

    const response = await androidPublisher.reviews.list({
      packageName,
    });

    const reviews: NormalizedReview[] = (response.data.reviews || []).map((review) => {
      const comment = review.comments?.[0]?.userComment;
      return {
        id: review.reviewId || "",
        store: "google" as const,
        rating: comment?.starRating || 0,
        title: undefined,
        body: comment?.text || "",
        author: review.authorName || "Anonymous",
        date: comment?.lastModified?.seconds
          ? new Date(parseInt(comment.lastModified.seconds) * 1000).toISOString()
          : new Date().toISOString(),
      };
    });

    return NextResponse.json(reviews);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
