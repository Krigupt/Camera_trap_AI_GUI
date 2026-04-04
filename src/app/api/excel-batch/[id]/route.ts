import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';
import { isAdminUserId } from '@/lib/admin';

/**
 * Delete one upload: all sheets that share uploadGroupId with the anchor document,
 * or legacy rows that share filename + bucket + uploadedAt.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const resolvedParams = await params;
    const anchor = await ExcelData.findById(resolvedParams.id);
    if (!anchor) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    const admin = isAdminUserId(userId);
    if (!admin && (!anchor.clerkUserId || anchor.clerkUserId !== userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (anchor.uploadGroupId) {
      await ExcelData.deleteMany(
        admin
          ? { uploadGroupId: anchor.uploadGroupId }
          : { clerkUserId: userId, uploadGroupId: anchor.uploadGroupId }
      );
    } else if (anchor.clerkUserId) {
      await ExcelData.deleteMany(
        admin
          ? {
              clerkUserId: anchor.clerkUserId,
              filename: anchor.filename,
              bucketName: anchor.bucketName,
              uploadedAt: anchor.uploadedAt,
            }
          : {
              clerkUserId: userId,
              filename: anchor.filename,
              bucketName: anchor.bucketName,
              uploadedAt: anchor.uploadedAt,
            }
      );
    } else {
      await ExcelData.deleteMany({
        filename: anchor.filename,
        bucketName: anchor.bucketName,
        uploadedAt: anchor.uploadedAt,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting excel batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete batch' },
      { status: 500 }
    );
  }
}
