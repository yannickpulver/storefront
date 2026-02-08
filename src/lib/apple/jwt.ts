import jwt from "jsonwebtoken";
import { auth } from "@/auth";
import { getSetting } from "@/lib/settings";

export async function generateAppleJWT(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [issuerId, keyId, privateKey] = await Promise.all([
    getSetting(session.user.id, "appleIssuerId"),
    getSetting(session.user.id, "appleKeyId"),
    getSetting(session.user.id, "applePrivateKey"),
  ]);

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
