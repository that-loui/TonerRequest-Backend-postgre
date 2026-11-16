import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import pool from "./config.js";

export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many attempts. Please try again later." } });
const publicUser = (row) => ({ id: row.user_id, firstName: row.first_name, lastName: row.last_name, fullName: `${row.first_name} ${row.last_name}`, email: row.email, departmentId: row.department_id, department: row.department_name, role: row.role_name, isActive: row.is_active, createdAt: row.created_at, lastLoginAt: row.last_login_at });
export const userById = async (id) => {
  const { rows } = await pool.query(`SELECT u.user_id,u.first_name,u.last_name,u.email,u.department_id,d.name department_name,r.name role_name,u.is_active,u.created_at,u.last_login_at FROM app_user u JOIN department d USING(department_id) JOIN app_role r USING(role_id) WHERE u.user_id=$1`, [id]);
  return rows[0] ? publicUser(rows[0]) : null;
};
export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.trms_session;
    if (!token) return res.status(401).json({ success: false, message: "Authentication required." });
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userById(claims.sub);
    if (!user?.isActive) return res.status(401).json({ success: false, message: "Authentication required." });
    req.user = user; next();
  } catch (error) { if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") return res.status(401).json({ success: false, message: "Authentication required." }); next(error); }
};
export const requireRoles = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
export const createSession = (res, userId) => {
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(userId), expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
  res.cookie("trms_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.COOKIE_SAME_SITE || "lax", maxAge: 8 * 60 * 60 * 1000, path: "/" });
};
export const clearSession = (res) => res.clearCookie("trms_session", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.COOKIE_SAME_SITE || "lax", path: "/" });
export const safeUser = userById;
export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
