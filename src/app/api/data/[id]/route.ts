import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';
import { isAdminUserId } from '@/lib/admin';

function canAccess(
  doc: { clerkUserId?: string | null },
  userId: string | null,
  isAdmin: boolean
) {
  if (isAdmin) return true;
  if (!userId) return false;
  if (!doc.clerkUserId) return true; // legacy uploads before owner field
  return doc.clerkUserId === userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = isAdminUserId(userId);
    await connectDB();

    const resolvedParams = await params;
    const excelData = await ExcelData.findById(resolvedParams.id);
    
    if (!excelData) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    if (!canAccess(excelData, userId, isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(excelData);
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = isAdminUserId(userId);
    await connectDB();

    const resolvedParams = await params;
    const existing = await ExcelData.findById(resolvedParams.id);
    if (!existing) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }
    if (!canAccess(existing, userId, isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { data } = body;

    const excelData = await ExcelData.findByIdAndUpdate(
      resolvedParams.id,
      { data },
      { new: true }
    );

    if (!excelData) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    return NextResponse.json(excelData);
  } catch (error) {
    console.error('Error updating data:', error);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}

function canDelete(
  doc: { clerkUserId?: string | null },
  userId: string | null,
  isAdmin: boolean
) {
  if (!userId) return false;
  if (isAdmin) return true;
  if (!doc.clerkUserId) return false;
  return doc.clerkUserId === userId;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = isAdminUserId(userId);
    await connectDB();

    const resolvedParams = await params;
    const existing = await ExcelData.findById(resolvedParams.id);
    if (!existing) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }
    if (!canDelete(existing, userId, isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ExcelData.findByIdAndDelete(resolvedParams.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting data:', error);
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 });
  }
}
