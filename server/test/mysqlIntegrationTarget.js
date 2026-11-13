import { assertMysqlDatabaseUrl } from "../_core/databaseConfig.js";

export function isMysqlIntegrationTestEnabled(env = process.env) {
  if (env.MYSQL_INTEGRATION_TESTS !== "1") return false;

  const databaseUrl = assertMysqlDatabaseUrl(env.DATABASE_URL);
  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
  if (!databaseName.toLowerCase().endsWith("_test")) {
    throw new Error("MySQL integration tests require a dedicated database whose name ends with _test.");
  }
  return true;
}
