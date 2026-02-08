import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings, ApiSettings } from "@/lib/settings";

export async function GET() {
  const settings = readSettings();
  // Return which keys are configured (don't expose full values)
  return NextResponse.json({
    googleServiceAccountJson: !!settings.googleServiceAccountJson,
    appleIssuerId: !!settings.appleIssuerId,
    appleKeyId: !!settings.appleKeyId,
    applePrivateKey: !!settings.applePrivateKey,
  });
}

function normalizePemKey(key?: string): string | undefined {
  if (!key) return undefined;
  // Strip existing newlines/extra spaces, then reconstruct proper PEM format
  const stripped = key.replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  return `-----BEGIN PRIVATE KEY-----\n${stripped}\n-----END PRIVATE KEY-----`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApiSettings = await request.json();
    const current = readSettings();

    const updated: ApiSettings = {
      googleServiceAccountJson:
        body.googleServiceAccountJson ?? current.googleServiceAccountJson,
      appleIssuerId: body.appleIssuerId ?? current.appleIssuerId,
      appleKeyId: body.appleKeyId ?? current.appleKeyId,
      applePrivateKey: normalizePemKey(body.applePrivateKey) ?? current.applePrivateKey,
    };

    writeSettings(updated);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save settings" },
      { status: 500 }
    );
  }
}
