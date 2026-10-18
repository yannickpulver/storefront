import type { playdeveloperreporting_v1beta1 } from "@googleapis/playdeveloperreporting";
import { pool } from "@/lib/pool";

type PlayReporting = playdeveloperreporting_v1beta1.Playdeveloperreporting;

export interface GoogleApp {
  packageName: string;
  displayName: string;
  lastUploadAt?: string;
}

// Play pages scraped at once, to stay below Google's rate limit.
const SCRAPE_CONCURRENCY = 4;

/** Upload date from the public Play page; Google has no API for it. */
async function scrapeUpdatedAt(packageName: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&hl=en&gl=us`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return undefined;
    // The "Updated on" date is the first date on the page, e.g. "Mar 13, 2024".
    const match = (await res.text()).match(
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}/
    );
    const parsed = match ? new Date(match[0]) : null;
    return parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : undefined;
  } catch {
    return undefined;
  }
}

/** Every app of the account, with its last upload date. */
export async function listGoogleApps(client: PlayReporting): Promise<GoogleApp[]> {
  const apps: GoogleApp[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await client.apps.search({ pageSize: 100, pageToken });
    for (const app of data.apps ?? []) {
      const packageName = app.packageName ?? app.name?.replace(/^apps\//, "") ?? "";
      apps.push({ packageName, displayName: app.displayName ?? packageName });
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  return pool(apps, SCRAPE_CONCURRENCY, async (app) => ({
    ...app,
    lastUploadAt: await scrapeUpdatedAt(app.packageName),
  }));
}
