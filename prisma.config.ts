// Prisma 7 no longer reads .env on its own the way earlier versions did, so the
// CLI would see DATABASE_URL as unset even when it is present in .env. Loading
// it explicitly here keeps `prisma migrate` / `prisma studio` working from a
// plain `.env` with no extra shell setup.
import "dotenv/config";
import * as path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 moved the datasource connection string out of schema.prisma and into
 * this file. It is read by the CLI only (`prisma migrate`, `prisma studio`);
 * the running application connects through the node-postgres driver adapter in
 * src/prisma/prisma.service.ts, which reads the same DATABASE_URL.
 *
 * DATABASE_URL is never committed — see .env.example.
 */
export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
