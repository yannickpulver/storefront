import jwt from "jsonwebtoken";

// App Store Connect refuses tokens that live longer than 20 minutes.
export function generateAppleJWT(issuerId: string, keyId: string, privateKey: string): string {
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
