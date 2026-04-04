import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import connectDB from "@/lib/mongodb";
import ExcelData from "@/models/ExcelData";
import { isAdminUserId } from "@/lib/admin";

/**
 * Delete a Clerk user and all MongoDB Excel batches owned by that user.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: actorId } = await auth();
    if (!actorId || !isAdminUserId(actorId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId: targetId } = await params;
    if (!targetId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }
    if (targetId === actorId) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account from here." },
        { status: 400 }
      );
    }

    await connectDB();
    await ExcelData.deleteMany({ clerkUserId: targetId });

    const client = await clerkClient();
    await client.users.deleteUser(targetId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
