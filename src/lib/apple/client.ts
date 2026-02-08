import { generateAppleJWT } from "./jwt";

const BASE_URL = "https://api.appstoreconnect.apple.com";

export async function appleApiFetch(path: string): Promise<Response> {
  const token = generateAppleJWT();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Apple API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response;
}
