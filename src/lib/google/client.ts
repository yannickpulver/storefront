import { androidpublisher, auth as publisherAuth } from "@googleapis/androidpublisher";
import { playdeveloperreporting, auth as reportingAuth } from "@googleapis/playdeveloperreporting";
import { auth } from "@/auth";
import { getSetting } from "@/lib/settings";

async function readServiceAccount() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const serviceAccountJson = await getSetting(session.user.id, "googleServiceAccountJson");
  if (!serviceAccountJson) {
    throw new Error("Google Service Account JSON is not configured");
  }

  try {
    return JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("Failed to parse Google Service Account JSON");
  }
}

// Each client asks only for the scope of its own API.
export async function getAndroidPublisher() {
  const credentials = await readServiceAccount();
  return androidpublisher({
    version: "v3",
    auth: new publisherAuth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    }),
  });
}

export async function getPlayDeveloperReporting() {
  const credentials = await readServiceAccount();
  return playdeveloperreporting({
    version: "v1beta1",
    auth: new reportingAuth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/playdeveloperreporting"],
    }),
  });
}
