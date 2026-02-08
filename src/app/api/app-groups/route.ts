import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appGroups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db()
    .select()
    .from(appGroups)
    .where(eq(appGroups.userId, session.user.id));

  const groups = rows.map((r) => ({
    id: r.id,
    name: r.name,
    google: r.googlePackageName
      ? { packageName: r.googlePackageName, name: r.googleName ?? r.googlePackageName }
      : undefined,
    apple: r.appleAppId
      ? {
          appId: r.appleAppId,
          name: r.appleName ?? "",
          bundleId: r.appleBundleId ?? "",
          ...(r.applePlatforms ? { platforms: r.applePlatforms.split(",") } : {}),
        }
      : undefined,
  }));

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const [row] = await db()
    .insert(appGroups)
    .values({
      userId: session.user.id,
      name: body.name,
      googlePackageName: body.google?.packageName ?? null,
      googleName: body.google?.name ?? null,
      appleAppId: body.apple?.appId ?? null,
      appleName: body.apple?.name ?? null,
      appleBundleId: body.apple?.bundleId ?? null,
      applePlatforms: body.apple?.platforms?.length ? body.apple.platforms.join(",") : null,
    })
    .returning();

  return NextResponse.json({
    id: row.id,
    name: row.name,
    google: row.googlePackageName
      ? { packageName: row.googlePackageName, name: row.googleName ?? row.googlePackageName }
      : undefined,
    apple: row.appleAppId
      ? {
          appId: row.appleAppId,
          name: row.appleName ?? "",
          bundleId: row.appleBundleId ?? "",
          ...(row.applePlatforms ? { platforms: row.applePlatforms.split(",") } : {}),
        }
      : undefined,
  });
}
