import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const docs = await ExcelData.find({ clerkUserId: userId })
      .sort({ uploadedAt: -1 })
      .select('_id filename sheetName bucketName uploadedAt')
      .lean();

    const batches = docs.map((d) => ({
      id: String(d._id),
      filename: d.filename,
      sheetName: d.sheetName,
      bucketName: d.bucketName,
      uploadedAt: d.uploadedAt,
    }));

    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error('Error listing batches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list batches' },
      { status: 500 }
    );
  }
}
