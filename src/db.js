import pkg from "pg";
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL en variables de entorno");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // necesario en la mayoría de hosts + Supabase
});

export async function q(text, params) {
  return pool.query(text, params);
}
