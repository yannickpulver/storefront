import { google } from "googleapis";
import { auth } from "@/auth";
import { getSetting } from "@/lib/settings";

export async function getAndroidPublisher() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const serviceAccountJson = await getSetting(
    session.user.id,
    "googleServiceAccountJson"
  );

  if (!serviceAccountJson) {
    throw new Error("Google Service Account JSON is not configured");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("Failed to parse Google Service Account JSON");
  }

  const authClient = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  return google.androidpublisher({
    version: "v3",
    auth: authClient,
  });
}

export async function getPlayDeveloperReporting() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const serviceAccountJson = await getSetting(
    session.user.id,
    "googleServiceAccountJson"
  );

  if (!serviceAccountJson) {
    throw new Error("Google Service Account JSON is not configured");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("Failed to parse Google Service Account JSON");
  }

  const authClient = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/playdeveloperreporting"],
  });

  return google.playdeveloperreporting({
    version: "v1beta1",
    auth: authClient,
  });
}
