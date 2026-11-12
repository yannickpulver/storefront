export interface AppGroup {
  id: string;
  name: string;
  customIcon?: string;
  google?: { packageName: string; name: string; consoleUrl?: string };
  apple?: { appId: string; name: string; bundleId: string; platforms?: string[] };
}

export interface NormalizedReview {
  id: string;
  store: "google" | "apple";
  rating: number;
  title?: string;
  body: string;
  author: string;
  date: string;
}

export type StatusCategory = "live" | "review" | "pending" | "issue" | "draft";

export interface NormalizedRelease {
  store: "google" | "apple";
  /** App Store version id, for actions on the version. */
  id?: string;
  version: string;
  versionCode?: string;
  track: string;
  /** Raw store state, e.g. READY_FOR_SALE, inProgress, IN_REVIEW; labelled in the UI. */
  status: string;
  statusCategory: StatusCategory;
  /** Apple platform, e.g. IOS. */
  platform?: string;
  /** Build upload date. */
  publishedAt?: string;
  /** When a TestFlight build stops being testable. */
  expiresAt?: string;
  /** A staged rollout still under way; absent once the release reaches every user. */
  rollout?: Rollout;
}

/**
 * Apple's phased release and Google's staged rollout in one shape: `fraction` is the share of
 * users the release reaches (null while a phased release has not started).
 */
export interface Rollout {
  state: "planned" | "active" | "paused";
  fraction: number | null;
}

/** Google Play crash and freeze rates of one version, from 0 to 1. */
export interface VersionVitals {
  crashRate: number | null;
  anrRate: number | null;
  /** How many days the rates cover. */
  days: number;
  /** The newest day they cover, YYYY-MM-DD in Los Angeles time. */
  through: string;
}

export type AppVersionVitals = Record<string, VersionVitals>;
