import bcrypt from "bcryptjs";
import pool from "../modules/config.js";
// Configure ADMIN_SEED_JSON as a JSON array of {email,firstName,lastName,department,password}.
// Passwords are hashed here and never stored in source control.
try {
 const admins=JSON.parse(process.env.ADMIN_SEED_JSON||"[]");
 if(!admins.length) throw new Error("Set ADMIN_SEED_JSON to one or more provisioned administrator accounts.");
 for(const a of admins){if(!a.email||!a.password||!a.firstName||!a.lastName||!a.department)throw new Error("Each admin requires email, password, firstName, lastName and department.");
  const hash=await bcrypt.hash(a.password,12);
  await pool.query(`INSERT INTO app_user(first_name,last_name,email,password_hash,department_id,role_id) VALUES($1,$2,$3,$4,(SELECT department_id FROM department WHERE name=$5),(SELECT role_id FROM app_role WHERE name=$6)) ON CONFLICT(email) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,password_hash=EXCLUDED.password_hash,department_id=EXCLUDED.department_id,role_id=EXCLUDED.role_id,updated_at=now()`,[a.firstName,a.lastName,a.email.trim().toLowerCase(),hash,a.department,a.role||"ICT Administrator"]);
 }
 console.log(`Provisioned ${admins.length} administrator account(s).`);
} finally { await pool.end(); }
