import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../modules/config.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migrationsPath = path.join(root, "migrations");
try {
  await pool.query(`CREATE TABLE IF NOT EXISTS trms_migration (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const files = (await fs.readdir(migrationsPath))
    .filter((file) => /^\d+.*\.sql$/i.test(file))
    .sort();
  for (const name of files) {
    const { rowCount } = await pool.query(
      "SELECT 1 FROM trms_migration WHERE name=$1",
      [name],
    );
    if (rowCount) continue;
    await pool.query(await fs.readFile(path.join(migrationsPath, name), "utf8"));
    await pool.query("INSERT INTO trms_migration(name) VALUES($1)", [name]);
    console.log(`Applied ${name}.`);
  }
} finally {
  await pool.end();
}
