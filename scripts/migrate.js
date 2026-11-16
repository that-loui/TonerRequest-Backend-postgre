import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../modules/config.js";
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
try { const sql=await fs.readFile(path.join(root,"migrations","001_auth_notifications.sql"),"utf8"); await pool.query(sql); console.log("Migration 001 applied."); }
finally { await pool.end(); }
