"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  FileSpreadsheet,
  Trash2,
  Loader2,
  Calendar,
  ExternalLink,
  Shield,
} from "lucide-react";
import type { AdminListBatch } from "@/lib/group-excel-batches";

export type AdminUserRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: number;
};

export function AdminPanel({
  users,
  batches,
  currentUserId,
}: {
  users: AdminUserRow[];
  batches: AdminListBatch[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);

  const emailByUserId = (uid: string | null) => {
    if (!uid) return "—";
    const u = users.find((x) => x.id === uid);
    return u?.email || uid;
  };

  const deleteUser = async (targetId: string, label: string) => {
    if (
      !confirm(
        `Permanently delete this user from Clerk and remove all of their Excel batches from MongoDB?\n\n${label}\n\nThis cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingUser(targetId);
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Could not delete user.");
        return;
      }
      router.replace("/admin");
    } catch {
      alert("Network error.");
    } finally {
      setDeletingUser(null);
    }
  };

  const deleteBatch = async (anchorId: string, label: string) => {
    if (
      !confirm(
        `Delete this upload and all its sheets from MongoDB?\n\n${label}\n\nThis cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingBatch(anchorId);
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
      router.replace("/admin");
    } catch {
      alert("Network error.");
    } finally {
      setDeletingBatch(null);
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-blue-600" />
          Clerk users
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Accounts in this Clerk application (up to 100 per load). Deleting a
          user removes them from Clerk and deletes their MongoDB batches.
        </p>
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {users.length === 0 ? (
            <li className="p-6 text-gray-500 text-sm">No users found.</li>
          ) : (
            users.map((u) => {
              const label =
                [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                u.email ||
                u.id;
              const canDelete = u.id !== currentUserId;
              return (
                <li
                  key={u.id}
                  className="flex items-center gap-3 p-4 hover:bg-slate-50/80"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {label}
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {u.id}
                    </p>
                    {u.email && (
                      <p className="text-sm text-gray-600 truncate">{u.email}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Joined{" "}
                      {new Date(u.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {canDelete ? (
                    <button
                      type="button"
                      title="Delete user"
                      disabled={deletingUser === u.id}
                      onClick={() => deleteUser(u.id, label)}
                      className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingUser === u.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 shrink-0">You</span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          All uploads (MongoDB)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          One row per file, bucket, and owner (latest upload). Older re-uploads
          of the same file stay in MongoDB with their tags until deleted; Open
          targets the newest upload only.
        </p>
        <ul className="space-y-3">
          {batches.length === 0 ? (
            <li className="rounded-xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-gray-600 text-sm">
              No batches in MongoDB.
            </li>
          ) : (
            batches.map((b) => (
              <li
                key={b.anchorId}
                className="flex items-stretch gap-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <Link
                  href={`/dashboard/${b.anchorId}?source=admin`}
                  className="flex flex-1 items-start gap-4 p-4 min-w-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="rounded-lg bg-blue-50 p-2 shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {b.filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {b.sheetCount === 1
                        ? "1 sheet"
                        : `${b.sheetCount} sheets`}{" "}
                      · {b.bucketName}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Owner: {emailByUserId(b.clerkUserId)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {b.uploadedAt
                        ? new Date(b.uploadedAt).toLocaleString()
                        : "—"}
                    </p>
                    {b.olderVersionsHidden > 0 ? (
                      <p className="text-xs text-amber-800/90 mt-1.5">
                        Latest of {b.olderVersionsHidden + 1} uploads —{" "}
                        {b.olderVersionsHidden} older version
                        {b.olderVersionsHidden === 1 ? "" : "s"} still in the
                        database (not shown).
                      </p>
                    ) : null}
                  </div>
                  <ExternalLink className="w-4 h-4 text-blue-500 shrink-0 self-center" />
                </Link>
                <button
                  type="button"
                  title="Delete upload"
                  disabled={deletingBatch === b.anchorId}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteBatch(b.anchorId, b.filename);
                  }}
                  className="shrink-0 px-3 flex items-center justify-center border-l border-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingBatch === b.anchorId ? (
                    <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export function AdminHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-100 p-3">
          <Shield className="w-8 h-8 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage users and inspect or remove any upload.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Link
          href="/admin/master-sheet"
          className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
        >
          Master sheet
        </Link>
        <Link
          href="/batches"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Back to app
        </Link>
      </div>
    </div>
  );
}
