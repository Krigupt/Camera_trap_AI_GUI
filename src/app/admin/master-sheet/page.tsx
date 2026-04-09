import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { isAdminUserId } from "@/lib/admin";
import { MasterSheetForm } from "./master-sheet-form";

export default async function MasterSheetPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!isAdminUserId(userId)) redirect("/");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to admin
        </Link>

        <div className="flex items-start gap-3 mb-6">
          <div className="rounded-xl bg-indigo-100 p-3">
            <FileSpreadsheet className="w-8 h-8 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Master sheet</h1>
            <p className="text-gray-600 text-sm mt-1">
              Merge Species workbooks, species CSV, and predictions into one
              master CSV (admin only).
            </p>
          </div>
        </div>

        <MasterSheetForm />
      </div>
    </div>
  );
}
