import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/");

  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <SignUp fallbackRedirectUrl="/" signInUrl="/sign-in" />
    </main>
  );
}
