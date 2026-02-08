import { NextRequest, NextResponse } from "next/server";
import { getAndroidPublisher } from "@/lib/google/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const packageName = searchParams.get("packageName");

    if (!packageName) {
      return NextResponse.json(
        { error: "packageName query parameter is required" },
        { status: 400 }
      );
    }

    const androidPublisher = getAndroidPublisher();

    // Validate package exists by creating and deleting an edit
    const editResponse = await androidPublisher.edits.insert({
      packageName,
    });

    const editId = editResponse.data.id;

    if (editId) {
      await androidPublisher.edits.delete({
        packageName,
        editId,
      });
    }

    return NextResponse.json({
      packageName,
      name: packageName,
    });
  } catch (error: any) {
    const status = error.code === 404 ? 400 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to validate app" },
      { status }
    );
  }
}
