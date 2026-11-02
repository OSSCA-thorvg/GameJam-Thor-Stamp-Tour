import { defineConfig } from "drizzle-kit";
import "./src/lib/env";

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://stamp:stamp@localhost:5432/stamp_tour",
  },
});
