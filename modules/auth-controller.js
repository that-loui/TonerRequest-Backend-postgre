import pool from "./config.js";
import {
  clearSession,
  createSession,
  hashPassword,
  safeUser,
  verifyPassword,
} from "./auth.js";

export const departments = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT department_id AS id, name FROM department WHERE is_active=true ORDER BY name",
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
};
export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, departmentId } =
      req.body || {};
    if (
      ![firstName, lastName, email, password, departmentId].every(
        (v) => v !== undefined && String(v).trim(),
      )
    )
      return res
        .status(400)
        .json({
          success: false,
          message:
            "First name, last name, email, password and department are required.",
        });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address." });
    if (String(password).length < 10 || String(password).length > 72)
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be between 10 and 72 characters.",
        });
    const { rows: dup } = await pool.query(
      "SELECT 1 FROM app_user WHERE email=$1",
      [normalizedEmail],
    );
    if (dup.length)
      return res
        .status(409)
        .json({
          success: false,
          message:
            "This email address is already registered. Please sign in to your existing account.",
        });
    const { rows: dept } = await pool.query(
      "SELECT department_id FROM department WHERE department_id=$1 AND is_active=true",
      [departmentId],
    );
    if (!dept.length)
      return res
        .status(400)
        .json({ success: false, message: "Select a valid department." });
    const hash = await hashPassword(password);
    const result = await pool.query(
      "INSERT INTO app_user(first_name,last_name,email,password_hash,department_id,role_id) VALUES($1,$2,$3,$4,$5,(SELECT role_id FROM app_role WHERE name='Employee')) RETURNING user_id",
      [
        String(firstName).trim(),
        String(lastName).trim(),
        normalizedEmail,
        hash,
        departmentId,
      ],
    );
    res
      .status(201)
      .json({ success: true, user: await safeUser(result.rows[0].user_id) });
  } catch (e) {
    if (e.code === "23505")
      return res
        .status(409)
        .json({
          success: false,
          message:
            "This email address is already registered. Please sign in to your existing account.",
        });
    next(e);
  }
};
export const login = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "")
        .trim()
        .toLowerCase(),
      password = String(req.body?.password || "");
    const { rows } = await pool.query(
      "SELECT user_id,password_hash,is_active FROM app_user WHERE email=$1",
      [email],
    );
    const row = rows[0];
    if (
      !row ||
      !row.is_active ||
      !(await verifyPassword(password, row.password_hash))
    )
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    await pool.query(
      "UPDATE app_user SET last_login_at=now() WHERE user_id=$1",
      [row.user_id],
    );
    createSession(res, row.user_id);
    res.json({ success: true, user: await safeUser(row.user_id) });
  } catch (e) {
    next(e);
  }
};
export const logout = (req, res) => {
  clearSession(res);
  res.json({ success: true });
};
export const me = (req, res) => res.json({ success: true, user: req.user });
export const profilePatch = async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body || {};
    if (!String(firstName || "").trim() || !String(lastName || "").trim())
      return res
        .status(400)
        .json({ success: false, message: "First and last name are required." });
    await pool.query(
      "UPDATE app_user SET first_name=$1,last_name=$2,updated_at=now() WHERE user_id=$3",
      [String(firstName).trim(), String(lastName).trim(), req.user.id],
    );
    res.json({ success: true, user: await safeUser(req.user.id) });
  } catch (e) {
    next(e);
  }
};
export const adminUsers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id,u.first_name,u.last_name,u.email,u.department_id,d.name department_name,r.name role_name,u.is_active,u.created_at,u.last_login_at FROM app_user u JOIN department d USING(department_id) JOIN app_role r USING(role_id) ORDER BY u.created_at DESC`,
    );
    res.json({
      success: true,
      users: rows.map((r) => ({
        id: r.user_id,
        firstName: r.first_name,
        lastName: r.last_name,
        fullName: `${r.first_name} ${r.last_name}`,
        email: r.email,
        departmentId: r.department_id,
        department: r.department_name,
        role: r.role_name,
        isActive: r.is_active,
        createdAt: r.created_at,
        lastLoginAt: r.last_login_at,
      })),
    });
  } catch (e) {
    next(e);
  }
};
export const adminUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id),
      user = Number.isInteger(id) && id > 0 ? await safeUser(id) : null;
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    res.json({ success: true, user });
  } catch (e) {
    next(e);
  }
};
export const adminPatch = async (req, res, next) => {
  try {
    const id = Number(req.params.id),
      { role, departmentId } = req.body || {};
    if (!Number.isInteger(id) || (!role && !departmentId))
      return res
        .status(400)
        .json({
          success: false,
          message: "Provide a valid role or departmentId.",
        });
    if (role) {
      const r = await pool.query(
        "UPDATE app_user SET role_id=(SELECT role_id FROM app_role WHERE name=$1),updated_at=now() WHERE user_id=$2 AND EXISTS(SELECT 1 FROM app_role WHERE name=$1)",
        [role, id],
      );
      if (!r.rowCount)
        return res
          .status(400)
          .json({ success: false, message: "Invalid role or user." });
    }
    if (departmentId)
      await pool.query(
        "UPDATE app_user SET department_id=$1,updated_at=now() WHERE user_id=$2",
        [departmentId, id],
      );
    const user = await safeUser(id);
    return user
      ? res.json({ success: true, user })
      : res.status(404).json({ success: false, message: "User not found." });
  } catch (e) {
    next(e);
  }
};
export const adminStatus = async (req, res, next) => {
  try {
    if (typeof req.body?.isActive !== "boolean")
      return res
        .status(400)
        .json({ success: false, message: "isActive must be a boolean." });
    const { rows } = await pool.query(
      "UPDATE app_user SET is_active=$1,updated_at=now() WHERE user_id=$2 RETURNING user_id",
      [req.body.isActive, req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    res.json({ success: true, user: await safeUser(req.params.id) });
  } catch (e) {
    next(e);
  }
};
