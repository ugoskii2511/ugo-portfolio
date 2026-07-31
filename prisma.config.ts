import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI commands (migrate, studio, db pull) use the direct, unpooled
// connection. The app's PrismaClient (src/lib/db.ts) uses the pooled
// DATABASE_URL at runtime via the @prisma/adapter-pg driver adapter.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
