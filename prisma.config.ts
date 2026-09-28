import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI only (migrate/seed). Neon's pooled URL can't take migrations, so prefer its direct one.
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});
