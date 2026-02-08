import jwt from "jsonwebtoken";
import { getSetting } from "@/lib/settings";

export function generateAppleJWT(): string {
  const issuerId = getSetting("appleIssuerId", process.env.APPLE_ISSUER_ID);
  const keyId = getSetting("appleKeyId", process.env.APPLE_KEY_ID);
  const privateKey = getSetting("applePrivateKey", process.env.APPLE_PRIVATE_KEY);

  if (!issuerId || !keyId || !privateKey) {
    throw new Error(
      "Missing Apple credentials: Issuer ID, Key ID, and Private Key required"
    );
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 20 * 60,
    aud: "appstoreconnect-v1",
  };

  return jwt.sign(payload, privateKey, {
    algorithm: "ES256",
    keyid: keyId,
  });
}
