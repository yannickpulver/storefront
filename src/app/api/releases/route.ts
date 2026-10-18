import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appGroups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAndroidPublisher } from "@/lib/google/client";
import { fetchGoogleReleases } from "@/lib/google/releases";
import { getAppleFetcher } from "@/lib/apple/client";
import { fetchAppleReleases } from "@/lib/apple/releases";
import { pool } from "@/lib/pool";
import type { ReleasesByGroup, StoreResult } from "@/lib/releases";
import type { NormalizedRelease } from "@/lib/types";

// Apps read at once, so a long app list does not fire every store request at the same moment.
const GROUP_CONCURRENCY = 6;

function settle(read: () => Promise<NormalizedRelease[]>): Promise<StoreResult> {
  return read().then(
    (releases) => ({ releases }),
    (error: unknown) => ({ error: error instanceof Error ? error.message : "Failed to load" })
  );
}

/** Every app's releases from both stores. A store that fails for an app carries its error. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await db().select().from(appGroups).where(eq(appGroups.userId, session.user.id));

  // One client per store for all apps; a store without credentials fails each of its apps.
  const publisher = groups.some((g) => g.googlePackageName) ? getAndroidPublisher() : null;
  const fetcher = groups.some((g) => g.appleAppId) ? getAppleFetcher() : null;
  publisher?.catch(() => {});
  fetcher?.catch(() => {});

  const results = await pool(groups, GROUP_CONCURRENCY, async (group) => {
    const [google, apple] = await Promise.all([
      group.googlePackageName && publisher
        ? settle(async () => fetchGoogleReleases(await publisher, group.googlePackageName!))
        : undefined,
      group.appleAppId && fetcher
        ? settle(async () =>
            fetchAppleReleases(
              await fetcher,
              group.appleAppId!,
              group.applePlatforms?.split(",")
            )
          )
        : undefined,
    ]);
    return [group.id, { ...(google ? { google } : {}), ...(apple ? { apple } : {}) }] as const;
  });

  return NextResponse.json(Object.fromEntries(results) satisfies ReleasesByGroup);
}
