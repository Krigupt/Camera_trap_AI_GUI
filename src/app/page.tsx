import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import ExcelData from "@/models/ExcelData";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();
  const hasBatches = (await ExcelData.countDocuments({ clerkUserId: userId })) > 0;

  if (!hasBatches) {
    redirect("/upload");
  }
  redirect("/batches");
}
