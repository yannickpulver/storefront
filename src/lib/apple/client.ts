import { auth } from "@/auth";
import { readSettings } from "@/lib/settings";
import { generateAppleJWT } from "./jwt";

const BASE_URL = "https://api.appstoreconnect.apple.com/v1";

export interface AppleFetcher {
  get: <T>(path: string) => Promise<T>;
  post: (path: string, body: unknown) => Promise<void>;
}

/**
 * A fetcher signed with the user's App Store Connect key. One token covers every request of a
 * route, so the credentials are read once.
 */
export async function getAppleFetcher(): Promise<AppleFetcher> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const { appleIssuerId, appleKeyId, applePrivateKey } = await readSettings(session.user.id);
  if (!appleIssuerId || !appleKeyId || !applePrivateKey) {
    throw new Error("Missing Apple credentials: Issuer ID, Key ID, and Private Key required");
  }
  const token = generateAppleJWT(appleIssuerId, appleKeyId, applePrivateKey);

  const send = async (path: string, init: RequestInit = {}) => {
    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Apple API error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    return res;
  };

  return {
    get: async <T>(path: string): Promise<T> => (await send(path)).json() as Promise<T>,
    post: async (path, body) => {
      await send(path, { method: "POST", body: JSON.stringify(body) });
    },
  };
}

/** Every page of a list, following `links.next`; capped so a looping listing ends. */
export async function allPages<R extends { links?: { next?: string } }>(
  fetcher: AppleFetcher,
  firstPath: string,
  maxPages = 25
): Promise<R[]> {
  const pages: R[] = [];
  let path: string | undefined = firstPath;
  while (path && pages.length < maxPages) {
    const page: R = await fetcher.get<R>(path);
    pages.push(page);
    path = page.links?.next;
  }
  return pages;
}
