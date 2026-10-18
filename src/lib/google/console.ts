/**
 * Play Console base URL of an app, e.g. ".../u/0/developers/123/app/456", from any page of it.
 * Keeps the account index (u/0), which picks the signed-in Google account.
 */
export function parsePlayConsoleUrl(url: string): string | null {
  const match = url.match(/play\.google\.com\/console\/(?:u\/\d+\/)?developers\/\d+\/app\/\d+/);
  return match ? `https://${match[0]}` : null;
}

// Production and the default testing tracks have fixed pages. Closed testing tracks are numbered,
// so they link to the closed testing overview.
const TRACK_PATHS: Record<string, string> = {
  production: "tracks/production",
  beta: "tracks/open-testing",
  internal: "tracks/internal-testing",
};

export function playConsoleTrackUrl(consoleUrl: string, track: string): string | null {
  const base = parsePlayConsoleUrl(consoleUrl);
  return base ? `${base}/${TRACK_PATHS[track] ?? "closed-testing"}` : null;
}
