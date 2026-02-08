import { NextRequest, NextResponse } from "next/server";
import { getAndroidPublisher } from "@/lib/google/client";

const TRACK_ORDER = ["internal", "alpha", "beta", "production"] as const;

export async function POST(request: NextRequest) {
  let androidPublisher;
  let editId: string | undefined;
  let packageName: string | undefined;

  try {
    const body = await request.json();
    packageName = body.packageName;
    const sourceTrack: string = body.sourceTrack;
    const destTrack: string = body.destTrack;
    const rollout: number = body.rollout ?? 100;

    if (!packageName || !sourceTrack || !destTrack) {
      return NextResponse.json(
        { error: "packageName, sourceTrack, and destTrack are required" },
        { status: 400 }
      );
    }

    const srcIdx = TRACK_ORDER.indexOf(sourceTrack as typeof TRACK_ORDER[number]);
    const dstIdx = TRACK_ORDER.indexOf(destTrack as typeof TRACK_ORDER[number]);

    if (srcIdx === -1 || dstIdx === -1) {
      return NextResponse.json({ error: "Invalid track name" }, { status: 400 });
    }
    if (dstIdx <= srcIdx) {
      return NextResponse.json(
        { error: "Destination track must be higher than source track" },
        { status: 400 }
      );
    }
    if (rollout < 1 || rollout > 100) {
      return NextResponse.json({ error: "Rollout must be 1-100" }, { status: 400 });
    }

    androidPublisher = await getAndroidPublisher();

    const editResponse = await androidPublisher.edits.insert({ packageName });
    editId = editResponse.data.id!;

    const trackResponse = await androidPublisher.edits.tracks.get({
      packageName,
      editId,
      track: sourceTrack,
    });

    const sourceRelease = trackResponse.data.releases?.[0];
    if (!sourceRelease?.versionCodes?.length) {
      throw new Error("No release found on source track");
    }

    const versionCodes = sourceRelease.versionCodes;
    const status = rollout >= 100 ? "completed" : "inProgress";

    await androidPublisher.edits.tracks.update({
      packageName,
      editId,
      track: destTrack,
      requestBody: {
        track: destTrack,
        releases: [
          {
            versionCodes,
            status,
            ...(rollout < 100 && { userFraction: rollout / 100 }),
          },
        ],
      },
    });

    await androidPublisher.edits.commit({ packageName, editId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (editId && packageName && androidPublisher) {
      try {
        await androidPublisher.edits.delete({ packageName, editId });
      } catch {}
    }
    return NextResponse.json(
      { error: error.message || "Failed to promote release" },
      { status: 500 }
    );
  }
}
