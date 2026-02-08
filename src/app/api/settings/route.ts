import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readSettings, writeSettings, ApiSettings } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await readSettings(session.user.id);
  return NextResponse.json({
    googleServiceAccountJson: !!settings.googleServiceAccountJson,
    appleIssuerId: !!settings.appleIssuerId,
    appleKeyId: !!settings.appleKeyId,
    applePrivateKey: !!settings.applePrivateKey,
  });
}

function normalizePemKey(key?: string): string | undefined {
  if (!key) return undefined;
  const stripped = key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  return `-----BEGIN PRIVATE KEY-----\n${stripped}\n-----END PRIVATE KEY-----`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: ApiSettings = await request.json();
    const current = await readSettings(session.user.id);

    const updated: ApiSettings = {
      googleServiceAccountJson:
        body.googleServiceAccountJson ?? current.googleServiceAccountJson,
      appleIssuerId: body.appleIssuerId ?? current.appleIssuerId,
      appleKeyId: body.appleKeyId ?? current.appleKeyId,
      applePrivateKey:
        normalizePemKey(body.applePrivateKey) ?? current.applePrivateKey,
    };

    await writeSettings(session.user.id, updated);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save settings",
      },
      { status: 500 }
    );
  }
}
