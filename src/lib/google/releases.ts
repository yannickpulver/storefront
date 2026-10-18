import type { androidpublisher_v3 } from "@googleapis/androidpublisher";
import type { NormalizedRelease, Rollout, StatusCategory } from "@/lib/types";

type AndroidPublisher = androidpublisher_v3.Androidpublisher;

// Internal testing is the only track without a Google review.
const TRACKS_WITHOUT_REVIEW = ["internal"];

// Review states that replace the edit status. PUBLISHED and DRAFT keep the edit status,
// which carries the rollout detail (completed, inProgress, halted, draft).
const REVIEW_CATEGORIES: Record<string, StatusCategory> = {
  IN_REVIEW: "review",
  APPROVED_NOT_PUBLISHED: "pending",
  NOT_APPROVED: "issue",
  NOT_SENT_FOR_REVIEW: "draft",
};

// A staged rollout (inProgress) is published and served to a fraction of users, so it is live.
function mapStatus(status: string | null | undefined): StatusCategory {
  switch (status) {
    case "completed":
    case "inProgress":
      return "live";
    case "halted":
      return "issue";
    case "draft":
      return "draft";
    default:
      return "pending";
  }
}

// Google sets a user fraction only on a staged rollout that is in progress or halted.
function stagedRollout(release: androidpublisher_v3.Schema$TrackRelease): { rollout?: Rollout } {
  if (release.userFraction == null) return {};
  if (release.status === "inProgress")
    return { rollout: { state: "active", fraction: release.userFraction } };
  if (release.status === "halted")
    return { rollout: { state: "paused", fraction: release.userFraction } };
  return {};
}

/** Releases of all tracks, read through a temporary edit. */
async function fetchEditReleases(
  publisher: AndroidPublisher,
  packageName: string
): Promise<NormalizedRelease[]> {
  const { data: edit } = await publisher.edits.insert({ packageName });
  const editId = edit.id!;
  try {
    const { data } = await publisher.edits.tracks.list({ packageName, editId });
    return (data.tracks ?? []).flatMap((track) =>
      (track.releases ?? []).map((release) => ({
        store: "google" as const,
        version: release.name ?? release.versionCodes?.[0]?.toString() ?? "unknown",
        versionCode: release.versionCodes?.[0]?.toString(),
        track: track.track ?? "unknown",
        status: release.status ?? "unknown",
        statusCategory: mapStatus(release.status),
        ...stagedRollout(release),
      }))
    );
  } finally {
    await publisher.edits.delete({ packageName, editId }).catch(() => {});
  }
}

/**
 * Review state per version code of one track, read without an edit. Google limits this endpoint
 * hard and answers with 403 "Listing releases quota exceeded" once the quota is used up.
 */
async function fetchReviewStates(
  publisher: AndroidPublisher,
  packageName: string,
  track: string
): Promise<Map<string, string>> {
  const { data } = await publisher.applications.tracks.releases.list({
    parent: `applications/${packageName}/tracks/${track}`,
  });
  const states = new Map<string, string>();
  for (const release of data.releases ?? []) {
    const state = release.releaseLifecycleState?.replace("RELEASE_LIFECYCLE_STATE_", "");
    if (!state) continue;
    for (const artifact of release.activeArtifacts ?? []) {
      if (artifact.versionCode != null) states.set(String(artifact.versionCode), state);
    }
  }
  return states;
}

/**
 * Every track's releases, with the review state (in review, approved, rejected) laid over the
 * edit status. A track whose review state cannot be read keeps its edit status.
 */
export async function fetchGoogleReleases(
  publisher: AndroidPublisher,
  packageName: string
): Promise<NormalizedRelease[]> {
  const releases = await fetchEditReleases(publisher, packageName);
  const tracks = [...new Set(releases.map((r) => r.track))].filter(
    (t) => !TRACKS_WITHOUT_REVIEW.includes(t)
  );
  await Promise.all(
    tracks.map(async (track) => {
      const states = await fetchReviewStates(publisher, packageName, track).catch(
        () => new Map<string, string>()
      );
      for (const release of releases) {
        if (release.track !== track || !release.versionCode) continue;
        const state = states.get(release.versionCode);
        const category = state ? REVIEW_CATEGORIES[state] : undefined;
        if (!state || !category) continue;
        release.status = state;
        release.statusCategory = category;
      }
    })
  );
  return releases;
}
