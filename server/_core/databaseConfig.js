const MYSQL_URL_ERROR =
  "DATABASE_URL must be a MySQL connection URI (mysql://user:password@host:port/database); this application and its migrations use MySQL.";

export function mysqlDatabaseUrlError(value) {
  if (typeof value !== "string" || !value.trim()) return MYSQL_URL_ERROR;

  try {
    const url = new URL(value);
    if (url.protocol !== "mysql:" || !url.hostname || !url.pathname.slice(1)) {
      return MYSQL_URL_ERROR;
    }
  } catch {
    return MYSQL_URL_ERROR;
  }

  return null;
}

export function assertMysqlDatabaseUrl(value) {
  const error = mysqlDatabaseUrlError(value);
  if (error) {
    const configurationError = new Error(error);
    configurationError.code = "INVALID_DATABASE_URL";
    throw configurationError;
  }
  return value.trim();
}
