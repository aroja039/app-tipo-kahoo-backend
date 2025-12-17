import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("Falta DATABASE_URL en variables de entorno");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function query(text, params) {
  return pool.query(text, params);
}
