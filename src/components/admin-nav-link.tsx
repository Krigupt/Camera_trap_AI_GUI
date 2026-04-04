import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Shield } from "lucide-react";
import { isAdminUserId } from "@/lib/admin";

export async function AdminNavLink() {
  const { userId } = await auth();
  if (!isAdminUserId(userId)) return null;

  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
    >
      <Shield className="w-3.5 h-3.5" />
      Admin
    </Link>
  );
}
