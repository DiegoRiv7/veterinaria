import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // The libsql adapter is supported by Prisma 7 at runtime (used by
  // `prisma migrate deploy` against Turso) but `adapter` isn't in the
  // public PrismaConfig type yet, so we silence the typecheck here.
  // @ts-expect-error -- `adapter` is supported at runtime in Prisma 7 + libsql
  adapter: async () =>
    new PrismaLibSql({
      url: process.env.DATABASE_URL ?? "file:./dev.db",
      authToken: process.env.DATABASE_AUTH_TOKEN,
    }),
});
