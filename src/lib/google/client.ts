import { google } from "googleapis";
import { getSetting } from "@/lib/settings";

export function getAndroidPublisher() {
  const serviceAccountJson = getSetting(
    "googleServiceAccountJson",
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON
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

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  return google.androidpublisher({
    version: "v3",
    auth,
  });
}
