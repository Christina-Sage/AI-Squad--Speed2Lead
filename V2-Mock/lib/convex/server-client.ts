import { ConvexHttpClient } from "convex/browser";

/**
 * Server-side Convex client for Next.js server components / route handlers.
 * Reads the deployment URL from NEXT_PUBLIC_CONVEX_URL (set by `npx convex dev`
 * / `convex deploy`, and in the Vercel project env). Cached on globalThis so we
 * don't spin up a new client per request in a warm serverless instance.
 *
 * Replaces the former Neon/Postgres (Drizzle) db client at db/client.ts.
 */
declare global {
  var __convexClient: ConvexHttpClient | undefined;
}

export function getConvex(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set — run `npx convex dev` locally, or set it in the Vercel project env.",
    );
  }
  if (!globalThis.__convexClient) {
    globalThis.__convexClient = new ConvexHttpClient(url);
  }
  return globalThis.__convexClient;
}
