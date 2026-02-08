import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/crypto";

export interface ApiSettings {
  googleServiceAccountJson?: string;
  appleIssuerId?: string;
  appleKeyId?: string;
  applePrivateKey?: string;
}

const ENCRYPTED_FIELDS: (keyof ApiSettings)[] = [
  "googleServiceAccountJson",
  "appleIssuerId",
  "appleKeyId",
  "applePrivateKey",
];

export async function readSettings(userId: string): Promise<ApiSettings> {
  const [row] = await db()
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (!row) return {};

  const settings: ApiSettings = {};
  const fieldMap: Record<keyof ApiSettings, string | null> = {
    googleServiceAccountJson: row.googleServiceAccountJson,
    appleIssuerId: row.appleIssuerId,
    appleKeyId: row.appleKeyId,
    applePrivateKey: row.applePrivateKey,
  };

  for (const key of ENCRYPTED_FIELDS) {
    const val = fieldMap[key];
    if (val) {
      try {
        settings[key] = decrypt(val);
      } catch {
        settings[key] = val;
      }
    }
  }

  return settings;
}

export async function writeSettings(
  userId: string,
  settings: ApiSettings
): Promise<void> {
  const encrypted: Record<string, string | null> = {};
  for (const key of ENCRYPTED_FIELDS) {
    const val = settings[key];
    encrypted[key] = val ? encrypt(val) : null;
  }

  await db()
    .insert(userSettings)
    .values({
      userId,
      googleServiceAccountJson: encrypted.googleServiceAccountJson,
      appleIssuerId: encrypted.appleIssuerId,
      appleKeyId: encrypted.appleKeyId,
      applePrivateKey: encrypted.applePrivateKey,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        googleServiceAccountJson: encrypted.googleServiceAccountJson,
        appleIssuerId: encrypted.appleIssuerId,
        appleKeyId: encrypted.appleKeyId,
        applePrivateKey: encrypted.applePrivateKey,
        updatedAt: new Date(),
      },
    });
}

export async function getSetting(
  userId: string,
  key: keyof ApiSettings
): Promise<string | undefined> {
  const settings = await readSettings(userId);
  return settings[key] || undefined;
}
