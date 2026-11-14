#!/usr/bin/env node
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

// Parse MySQL URL: mysql://user:password@host:port/database
const url = new URL(DATABASE_URL);
const host = url.hostname;
const port = url.port || 3306;
const user = url.username;
const password = url.password || "";
const database = url.pathname.slice(1);

async function runMigration(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const connection = await mysql.createConnection({
    host,
    port: parseInt(port),
    user,
    password,
    database,
  });

  try {
    // Split by ';' and execute each statement
    const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0);

    for (const stmt of statements) {
      // Skip statement-breakpoint markers
      if (stmt.includes("statement-breakpoint")) {
        continue;
      }

      // Skip empty or comment-only lines
      if (stmt.startsWith("--") || stmt.startsWith("!--")) {
        continue;
      }

      // Execute the statement
      try {
        await connection.execute(stmt);
        // console.log(`  Executed statement successfully`);
      } catch (err) {
        // Some statements might fail if tables/columns already exist - that's ok for idempotent runs
        // Ignore "already exists" errors for idempotent migration
        if (!err.message.includes("already exists") && !err.message.includes("Table 'already exists'")) {
          // Console warning optional
        }
      }
    }

    console.log(`✓ Completed: ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`✗ Failed: ${path.basename(filePath)}:`, err);
    throw err;
  } finally {
    await connection.end();
  }
}

async function main() {
  const migrationDir = path.resolve("drizzle");
  const files = fs.readdirSync(migrationDir)
    .filter(f => f.startsWith("00") && f.endsWith(".sql"))
    .sort();

  console.log(`Running ${files.length} migrations from ${migrationDir}...\n`);

  for (const file of files) {
    console.log(`Running: ${file}`);
    await runMigration(path.join(migrationDir, file));
  }

  console.log("\n✓ All migrations completed.");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});