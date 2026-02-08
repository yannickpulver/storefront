import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appGroups } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = (await request.json()) as { ids: string[] };

  const database = db();
  await Promise.all(
    ids.map((id, index) =>
      database
        .update(appGroups)
        .set({ sortOrder: index })
        .where(and(eq(appGroups.id, id), eq(appGroups.userId, session.user!.id!)))
    )
  );

  return NextResponse.json({ ok: true });
}
