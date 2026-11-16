import pool from "../modules/config.js";
import { deliverNotification } from "../modules/notifications.js";
try {
  const { rows } = await pool.query("SELECT notification_id FROM email_notification WHERE status='failed' ORDER BY created_at LIMIT 100");
  for (const row of rows) await deliverNotification(row.notification_id);
  console.log(`Retried ${rows.length} failed notification(s).`);
} finally { await pool.end(); }
