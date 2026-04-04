import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import ExcelData from "@/models/ExcelData";
import { isAdminUserId } from "@/lib/admin";
import {
  groupExcelBatches,
  type ExcelBatchLean,
} from "@/lib/group-excel-batches";
import { AdminPanel, AdminHeader, type AdminUserRow } from "./admin-panel";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!isAdminUserId(userId)) redirect("/");

  const client = await clerkClient();
  const list = await client.users.getUserList({ limit: 100 });
  const users: AdminUserRow[] = list.data.map((u) => ({
    id: u.id,
    email:
      u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
        ?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      null,
    firstName: u.firstName,
    lastName: u.lastName,
    createdAt: u.createdAt,
  }));

  await connectDB();
  const docs = await ExcelData.find({})
    .sort({ uploadedAt: -1 })
    .select(
      "_id filename sheetName bucketName uploadedAt uploadGroupId clerkUserId"
    )
    .lean();

  const batches = groupExcelBatches(
    docs as unknown as ExcelBatchLean[],
    { includeOwnerInLegacyKey: true }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <AdminHeader />
        <AdminPanel
          users={users}
          batches={batches}
          currentUserId={userId}
        />
      </div>
    </div>
  );
}
