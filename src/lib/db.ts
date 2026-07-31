import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const RETRYABLE_PATTERN = /connection|timeout|terminated|econnreset|epipe/i;
// Worst case (every attempt fails) is MAX_RETRIES+1 attempts, each bounded by
// connectionTimeoutMillis below — keep both small enough that a total outage
// still fails in a reasonable time instead of stacking into a 30s+ hang.
const MAX_RETRIES = 1;

function withRetry(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          for (let attempt = 0; ; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              const isRetryable = RETRYABLE_PATTERN.test(message);
              if (!isRetryable || attempt >= MAX_RETRIES) throw error;
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }
        },
      },
    },
  });
}

function createPrismaClient() {
  // Supabase's pgbouncer (transaction mode) silently drops idle connections,
  // and the pooler itself is occasionally slow/flaky to (re)connect to. Two
  // layers of resilience: keepAlive + short idle/connection timeouts so the
  // pool self-heals instead of serving dead sockets, and a query-level retry
  // (below) so a transient connection failure doesn't surface as a 500 to
  // the visitor — it just quietly tries again.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
  });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return withRetry(client);
}

type PrismaClientWithRetry = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithRetry | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
