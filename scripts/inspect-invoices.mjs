import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [rows] = await connection.query("SHOW COLUMNS FROM issuedInvoices");
  console.table(rows);
} finally {
  await connection.end();
}
