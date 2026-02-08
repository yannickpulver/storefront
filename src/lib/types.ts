export interface AppGroup {
  id: string;
  name: string;
  google?: { packageName: string; name: string };
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

export interface NormalizedRelease {
  store: "google" | "apple";
  version: string;
  track: string;
  status: string;
  statusCategory: "live" | "review" | "pending" | "issue" | "draft";
  versionCode?: string;
}
