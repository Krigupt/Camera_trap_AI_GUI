import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';
import { isAdminUserId } from '@/lib/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const decodedFilename = decodeURIComponent(resolvedParams.filename);
    const batchId = request.nextUrl.searchParams.get('batchId');

    let sheets;

    if (batchId) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const admin = isAdminUserId(userId);
      const anchor = await ExcelData.findById(batchId);
      if (!anchor || anchor.filename !== decodedFilename) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      if (anchor.clerkUserId && !admin && anchor.clerkUserId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (anchor.clerkUserId) {
        const ownerId = admin ? anchor.clerkUserId : userId;
        const groupFilter = anchor.uploadGroupId
          ? {
              filename: decodedFilename,
              clerkUserId: ownerId,
              uploadGroupId: anchor.uploadGroupId,
            }
          : {
              filename: decodedFilename,
              clerkUserId: ownerId,
              uploadedAt: anchor.uploadedAt,
            };
        sheets = await ExcelData.find(groupFilter, { _id: 1, sheetName: 1 });
      } else {
        sheets = await ExcelData.find(
          { filename: decodedFilename },
          { _id: 1, sheetName: 1 }
        );
      }
    } else {
      const sheetsAll = await ExcelData.find(
        { filename: decodedFilename },
        { _id: 1, sheetName: 1 }
      );
      sheets = sheetsAll;
    }

    const sheetsData = sheets.map((sheet) => ({
      id: sheet._id.toString(),
      sheetName: sheet.sheetName
    }));

    const uniqueSheets = sheetsData.filter((sheet, index, self) => 
      index === self.findIndex(s => s.sheetName === sheet.sheetName)
    );

    return NextResponse.json(uniqueSheets);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return NextResponse.json({ error: 'Failed to fetch sheets' }, { status: 500 });
  }
}
