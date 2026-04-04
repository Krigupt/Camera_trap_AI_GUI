import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import ExcelData from "@/models/ExcelData";
import {
  groupExcelBatches,
  type ExcelBatchLean,
} from "@/lib/group-excel-batches";
import { Upload } from "lucide-react";
import { BatchList } from "./batch-list";

export default async function BatchesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();
  const docs = await ExcelData.find({ clerkUserId: userId })
    .sort({ uploadedAt: -1 })
    .select("_id filename sheetName bucketName uploadedAt uploadGroupId clerkUserId")
    .lean();

  const grouped = groupExcelBatches(docs as unknown as ExcelBatchLean[]).map(
    ({ clerkUserId: _c, ...rest }) => rest
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your batches</h1>
            <p className="text-gray-600 text-sm mt-1">
              Each row is one <strong className="font-medium">upload</strong>.
              Open to work across all sheets; delete removes the whole file from
              the database.
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload new Excel
          </Link>
        </div>

        {docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-10 text-center">
            <p className="text-gray-600 mb-4">No uploads yet.</p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
            >
              <Upload className="w-4 h-4" />
              Upload your first Excel file
            </Link>
          </div>
        ) : (
          <BatchList batches={grouped} />
        )}
      </div>
    </div>
  );
}
