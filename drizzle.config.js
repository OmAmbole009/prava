import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { assertMysqlDatabaseUrl } from "./server/_core/databaseConfig.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.js",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: assertMysqlDatabaseUrl(connectionString),
  },
});
