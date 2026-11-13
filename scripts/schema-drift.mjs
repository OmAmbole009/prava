/**
 * Reports drift between drizzle/schema.js and a migrated MySQL database.
 *
 * Usage: DATABASE_URL=mysql://... node scripts/schema-drift.mjs
 * Exit code 1 when any table or column is missing or narrower than declared.
 */
import { getTableConfig } from "drizzle-orm/mysql-core";
import { createPool } from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(2);
}

const pool = createPool(url);
const [rows] = await pool.query(
  `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, IS_NULLABLE AS nullable, COLUMN_TYPE AS columnType
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`,
);
const live = new Map();
for (const row of rows) {
  if (!live.has(row.tableName)) live.set(row.tableName, new Map());
  live.get(row.tableName).set(row.columnName, row);
}

const problems = [];
let checkedTables = 0;
let checkedColumns = 0;

for (const [exportName, table] of Object.entries(schema)) {
  if (!table || typeof table !== "object" || !table[Symbol.for("drizzle:Name")]) continue;
  const config = getTableConfig(table);
  const tableName = config.name;
  checkedTables += 1;
  const liveColumns = live.get(tableName);
  if (!liveColumns) {
    problems.push(`MISSING TABLE ${tableName} (export ${exportName})`);
    continue;
  }
  for (const column of config.columns) {
    checkedColumns += 1;
    const found = liveColumns.get(column.name);
    if (!found) {
      problems.push(`MISSING COLUMN ${tableName}.${column.name} (declared ${column.getSQLType()})`);
      continue;
    }
    if (column.notNull && found.nullable === "YES") {
      problems.push(`NULLABLE MISMATCH ${tableName}.${column.name} is nullable in the database but not null in schema`);
    }
    if (column.enumValues?.length) {
      const expected = `enum(${column.enumValues.map(value => `'${value}'`).join(",")})`;
      if (String(found.columnType).toLowerCase() !== expected.toLowerCase()) {
        problems.push(`ENUM MISMATCH ${tableName}.${column.name} database=${found.columnType} schema=${expected}`);
      }
    }
  }
}

const [tableRows] = await pool.query(
  `SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`,
);
const schemaNames = new Set(
  Object.values(schema)
    .filter(table => table && typeof table === "object" && table[Symbol.for("drizzle:Name")])
    .map(table => getTableConfig(table).name),
);
const orphanTables = tableRows
  .map(row => row.tableName)
  .filter(name => !schemaNames.has(name) && name !== "__drizzle_migrations");

console.log(`Compared ${checkedTables} tables / ${checkedColumns} columns.`);
if (orphanTables.length) console.log(`Tables in the database but not in schema: ${orphanTables.join(", ")}`);
if (problems.length === 0) {
  console.log("No schema drift detected.");
} else {
  console.log(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.log(` - ${problem}`);
}

await pool.end();
process.exit(problems.length === 0 ? 0 : 1);
