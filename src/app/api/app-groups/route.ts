import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appGroups } from "@/lib/db/schema";
import { toAppGroup, toAppGroupValues } from "@/lib/app-groups";
import { asc, eq, max } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db()
    .select()
    .from(appGroups)
    .where(eq(appGroups.userId, session.user.id))
    .orderBy(asc(appGroups.sortOrder));

  return NextResponse.json(rows.map(toAppGroup));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // New groups go to the end of the list.
  const [{ last }] = await db()
    .select({ last: max(appGroups.sortOrder) })
    .from(appGroups)
    .where(eq(appGroups.userId, session.user.id));

  const [row] = await db()
    .insert(appGroups)
    .values({
      ...toAppGroupValues(body),
      name: body.name,
      userId: session.user.id,
      sortOrder: (last ?? -1) + 1,
    })
    .returning();

  return NextResponse.json(toAppGroup(row));
}
