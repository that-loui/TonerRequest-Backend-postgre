import { Resend } from "resend";
import pool from "./config.js";
const escapeHtml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
export async function sendPasswordResetEmail({ to, firstName, resetUrl }) {
  if (!resend || !process.env.RESEND_FROM_EMAIL) {
    throw new Error("Password reset email is not configured.");
  }
  const safeName = escapeHtml(firstName || "there");
  const safeUrl = escapeHtml(resetUrl);
  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject: "Reset your TRMS password",
    html: `<div style="font-family:Arial,sans-serif;color:#1d2939;max-width:560px;margin:auto"><h2 style="color:#5a287d">Great Nigeria Insurance | TRMS</h2><p>Hello ${safeName},</p><p>We received a request to reset your TRMS password. Use the button below within 30 minutes.</p><p><a href="${safeUrl}" style="display:inline-block;background:#5a287d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:7px">Reset password</a></p><p>If you did not request this change, you can ignore this email.</p><p style="font-size:12px;color:#777">For your security, this link can only be used once.</p></div>`,
  });
  if (result.error) throw new Error(result.error.message);
}
const template = (r, requester = false) =>
  `<div style="font-family:Arial,sans-serif;color:#1d2939"><h2 style="color:#154734">Great Nigeria Insurance | TRMS</h2><h3>${requester ? "Toner request received" : "New toner request requires attention"}</h3><table>${Object.entries(
    {
      "Request ID": r.request_id,
      Requester: `${r.first_name} ${r.last_name}`,
      "Requester email": r.email,
      Department: r.department,
      "Toner model": r.toner,
      Colour: r.color,
      Quantity: r.quantity,
      "Date submitted": r.requested_at,
      Status: r.status,
    },
  )
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px;font-weight:bold">${escapeHtml(k)}</td><td style="padding:6px">${escapeHtml(v)}</td></tr>`,
    )
    .join(
      "",
    )}</table>${requester ? "<p>Your request has been received. The ICT Department will process it and contact you as needed.</p>" : "<p>Please review and process this request.</p>"}</div>`;
export async function deliverNotification(id) {
  const { rows } = await pool.query(
    `SELECT n.notification_id,n.recipient,n.notification_type,r.request_id,r.requested_at,r.status,r.toner,r.color,r.quantity,u.first_name,u.last_name,u.email,d.name department FROM email_notification n JOIN request r USING(request_id) LEFT JOIN app_user u ON u.user_id=r.requester_user_id LEFT JOIN department d ON d.department_id=u.department_id WHERE n.notification_id=$1 AND n.status IN ('pending','failed')`,
    [id],
  );
  const n = rows[0];
  if (!n || !resend || !process.env.RESEND_FROM_EMAIL) return;
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: n.recipient,
      subject:
        n.notification_type === "ict"
          ? `New toner request #${n.request_id}`
          : `Toner request received #${n.request_id}`,
      html: template(n, n.notification_type === "requester"),
    });
    if (result.error) throw new Error(result.error.message);
    await pool.query(
      "UPDATE email_notification SET status='sent',attempts=attempts+1,last_error=NULL,sent_at=now() WHERE notification_id=$1",
      [id],
    );
  } catch (e) {
    console.error("TRMS email delivery failed", {
      notificationId: id,
      error: e.message,
    });
    await pool.query(
      "UPDATE email_notification SET status='failed',attempts=attempts+1,last_error=$2 WHERE notification_id=$1",
      [id, String(e.message).slice(0, 1000)],
    );
  }
}
