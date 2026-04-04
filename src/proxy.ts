import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/upload(.*)",
  "/batches(.*)",
  "/dashboard(.*)",
  "/api/gcp-buckets(.*)",
  "/api/upload(.*)",
  "/api/upload-csv(.*)",
  "/api/my-batches(.*)",
  "/api/excel-batch(.*)",
  "/api/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Never run Clerk on Next internals, Vercel widgets, or file-like paths (avoids 404 loops on CSS/JS in dev)
    "/((?!_next/|_vercel/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
