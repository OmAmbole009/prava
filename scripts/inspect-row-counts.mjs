import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [tables] = await connection.query(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);

  console.log("\n========== EXACT ROW COUNTS ==========");

  for (const { TABLE_NAME } of tables) {
    const [result] = await connection.query(
      `SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\``
    );

    console.log(`${TABLE_NAME}: ${result[0].total} rows`);
  }
} finally {
  await connection.end();
}
