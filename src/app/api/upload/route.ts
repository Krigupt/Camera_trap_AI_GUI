import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as XLSX from 'xlsx';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucketName = formData.get('bucketName') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!bucketName) {
      return NextResponse.json({ error: 'GCP bucket name is required' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    // Skip rich cell metadata where possible — faster on large workbooks
    const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: false });

    const uploadGroupId = randomUUID();

    const docsToInsert: Array<{
      filename: string;
      sheetName: string;
      bucketName: string;
      clerkUserId: string;
      uploadGroupId: string;
      data: Array<{
        human: string;
        ai: string;
        filenames: string;
        imagePaths: string[];
        tags: string[];
        isSelected: boolean;
      }>;
    }> = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = jsonData[0] as string[];
      if (!headers) continue;

      const humanIndex = headers.findIndex((h) =>
        h?.toLowerCase().includes("human")
      );
      const aiIndex = headers.findIndex((h) => h?.toLowerCase().includes("ai"));

      const filenamesIndices: number[] = [];
      headers.forEach((header, index) => {
        if (header?.toLowerCase().includes("filenames")) {
          filenamesIndices.push(index);
        }
      });

      if (humanIndex === -1 || aiIndex === -1 || filenamesIndices.length === 0) {
        continue;
      }

      const data = jsonData.slice(1).map((row: any) => {
        const rowArray = row as any[];

        const allFilenames: string[] = [];
        const filenamesStrings: string[] = [];

        filenamesIndices.forEach((filenamesIndex) => {
          const filenamesValue = rowArray[filenamesIndex] || "";
          if (filenamesValue && typeof filenamesValue === "string") {
            filenamesStrings.push(filenamesValue);
            const splitFilenames = filenamesValue
              .split(",")
              .map((f: string) => f.trim())
              .filter(Boolean);
            allFilenames.push(...splitFilenames);
          }
        });

        const combinedFilenamesString = filenamesStrings.join(",");

        return {
          human: rowArray[humanIndex] || "",
          ai: rowArray[aiIndex] || "",
          filenames: combinedFilenamesString,
          imagePaths: allFilenames,
          tags: [],
          isSelected: false,
        };
      });

      docsToInsert.push({
        filename: file.name,
        sheetName,
        bucketName,
        clerkUserId: userId,
        uploadGroupId,
        data,
      });
    }

    if (docsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'No valid sheets found with Human/AI/Filenames columns (supports Filenames, Filenames_1, Filenames_2, etc.)' },
        { status: 400 }
      );
    }

    // One bulk insert = fewer round-trips to MongoDB (major win on Atlas latency)
    const inserted = await ExcelData.insertMany(docsToInsert, { ordered: false });

    return NextResponse.json({
      id: inserted[0]._id,
      sheets: inserted.map((doc) => ({
        id: doc._id,
        sheetName: doc.sheetName,
      })),
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
