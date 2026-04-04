"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileSpreadsheet, Calendar, Trash2, Loader2 } from "lucide-react";

export type BatchGroupRow = {
  anchorId: string;
  filename: string;
  bucketName: string;
  sheetCount: number;
  uploadedAt: string | null;
};

export function BatchList({ batches }: { batches: BatchGroupRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (anchorId: string, label: string) => {
    if (
      !confirm(
        `Delete this upload?\n\n${label}\n\nThis removes all sheets from this Excel file from the database. This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(anchorId);
    try {
      const res = await fetch(`/api/excel-batch/${anchorId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not delete batch.");
        return;
      }
      router.replace("/batches");
    } catch {
      alert("Network error while deleting.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ul className="space-y-3">
      {batches.map((d) => (
        <li
          key={d.anchorId}
          className="flex items-stretch gap-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          <Link
            href={`/dashboard/${d.anchorId}?source=batches`}
            className="flex flex-1 items-start gap-4 p-4 min-w-0 hover:bg-slate-50 transition-colors"
          >
            <div className="rounded-lg bg-blue-50 p-2 shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{d.filename}</p>
              <p className="text-sm text-gray-500">
                {d.sheetCount === 1
                  ? "1 sheet"
                  : `${d.sheetCount} sheets`}{" "}
                · Bucket: {d.bucketName}
              </p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {d.uploadedAt
                  ? new Date(d.uploadedAt).toLocaleString()
                  : ""}
              </p>
            </div>
            <span className="text-sm font-medium text-blue-600 shrink-0 self-center">
              Open →
            </span>
          </Link>
          <button
            type="button"
            title="Delete this upload"
            disabled={deletingId === d.anchorId}
            onClick={(e) => {
              e.preventDefault();
              handleDelete(d.anchorId, d.filename);
            }}
            className="shrink-0 px-3 flex items-center justify-center border-l border-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deletingId === d.anchorId ? (
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
