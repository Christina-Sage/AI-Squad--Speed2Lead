import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

declare global {
  var __dbQueryClient: ReturnType<typeof postgres> | undefined;
}

const queryClient =
  globalThis.__dbQueryClient ?? postgres(process.env.DATABASE_URL!, { max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalThis.__dbQueryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
