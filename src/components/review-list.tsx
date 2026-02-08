"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { NormalizedReview } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm tracking-wide">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-amber-500" : "text-zinc-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ReviewList({ reviews }: { reviews: NormalizedReview[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? reviews : reviews.slice(0, 5);

  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews</p>;
  }

  return (
    <div className="space-y-3">
      {visible.map((r) => (
        <div key={r.id} className="space-y-1">
          <div className="flex items-center gap-2">
            <Stars rating={r.rating} />
            <span className="text-xs text-muted-foreground">
              {new Date(r.date).toLocaleDateString()}
            </span>
          </div>
          {r.title && (
            <p className="text-sm font-medium leading-tight">{r.title}</p>
          )}
          <p className="text-sm text-muted-foreground leading-snug line-clamp-3">
            {r.body}
          </p>
          <p className="text-xs text-muted-foreground/60">{r.author}</p>
        </div>
      ))}
      {reviews.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : `Show all ${reviews.length} reviews`}
        </Button>
      )}
    </div>
  );
}
