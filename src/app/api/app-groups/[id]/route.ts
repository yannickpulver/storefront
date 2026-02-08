import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appGroups } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const values: Record<string, unknown> = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.google !== undefined) {
    values.googlePackageName = body.google?.packageName ?? null;
    values.googleName = body.google?.name ?? null;
  }
  if (body.apple !== undefined) {
    values.appleAppId = body.apple?.appId ?? null;
    values.appleName = body.apple?.name ?? null;
    values.appleBundleId = body.apple?.bundleId ?? null;
  }

  const [row] = await db()
    .update(appGroups)
    .set(values)
    .where(and(eq(appGroups.id, id), eq(appGroups.userId, session.user.id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    name: row.name,
    google: row.googlePackageName
      ? { packageName: row.googlePackageName, name: row.googleName ?? row.googlePackageName }
      : undefined,
    apple: row.appleAppId
      ? { appId: row.appleAppId, name: row.appleName ?? "", bundleId: row.appleBundleId ?? "" }
      : undefined,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [row] = await db()
    .delete(appGroups)
    .where(and(eq(appGroups.id, id), eq(appGroups.userId, session.user.id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
