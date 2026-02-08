"use client";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReleaseList } from "@/components/release-list";
import { ReviewList } from "@/components/review-list";
import {
  useGoogleReviews,
  useGoogleReleases,
  useAppleReviews,
  useAppleReleases,
} from "@/hooks/use-store-data";

function StoreSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-3/4" />
    </div>
  );
}

export function GoogleStoreEntry({ packageName }: { packageName: string }) {
  const { data: releases, isLoading: relLoading, mutate } = useGoogleReleases(packageName);
  const { data: reviews, isLoading: revLoading } = useGoogleReviews(packageName);

  if (relLoading || revLoading) return <StoreSkeleton />;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Releases
        </h4>
        <ReleaseList releases={releases ?? []} packageName={packageName} onReleasesChanged={() => mutate()} />
      </div>
      <Separator />
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Reviews
        </h4>
        <ReviewList reviews={reviews ?? []} />
      </div>
    </div>
  );
}

export function AppleStoreEntry({ appId, platforms }: { appId: string; platforms?: string[] }) {
  const { data: releases, isLoading: relLoading } = useAppleReleases(appId, platforms);
  const { data: reviews, isLoading: revLoading } = useAppleReviews(appId);

  if (relLoading || revLoading) return <StoreSkeleton />;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Releases
        </h4>
        <ReleaseList releases={releases ?? []} />
      </div>
      <Separator />
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Reviews
        </h4>
        <ReviewList reviews={reviews ?? []} />
      </div>
    </div>
  );
}
