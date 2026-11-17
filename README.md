# TRMS PostgreSQL backend v2

## Setup

Use Node.js 20 or newer. Copy `.env.example` to `.env`, set PostgreSQL connection values, a random `JWT_SECRET` (32+ random bytes), the exact frontend origin, and Resend settings. In production use HTTPS and `COOKIE_SAME_SITE=lax` when the app and API are same-site; cross-site deployments need `COOKIE_SAME_SITE=none` and HTTPS. Keep `.env` private.

Install dependencies with `npm install`, then apply all additive migrations using `npm run migrate`. The migrations preserve toner, colour, stock and request rows; legacy requests keep a null requester user ID. Provision administrators by setting `ADMIN_SEED_JSON` in the deployment environment and running `npm run seed:admins`. Remove the provisioning variable after use. Newly registered accounts always receive Employee.

Start locally with `npm run server` or `npm start` after loading the environment.

## API

- `GET /api/departments` — active department choices.
- `POST /api/auth/register` — `{firstName,lastName,email,password,departmentId}`; returns 409 for an existing email.
- `POST /api/auth/login` — `{email,password}`; sets the HTTP-only `trms_session` cookie.
- `POST /api/auth/forgot-password` — `{email}`; sends a one-time reset link for an active account without revealing whether the email is registered.
- `POST /api/auth/reset-password` — `{token,password}`; consumes the emailed token, updates the bcrypt hash and invalidates existing JWT sessions.
- `POST /api/auth/logout`, `GET /api/auth/me`.
- `GET /api/users/profile`, `PATCH /api/users/profile` — first and last name only.
- `GET /api/admin/users`, `GET /api/admin/users/:id` — ICT and super administrators.
- `PATCH /api/admin/users/:id`, `PATCH /api/admin/users/:id/status` — super administrators only.
- `GET /api/toners`, `GET /api/colors?tonerName=...`, `GET /api/allColors` — catalog reads.
- `POST /api/request` — authenticated `{tonerName,color,quantity}`; identity and department come from the session.
- `GET /api/requests` — own requests for employees, all requests for administrators.
- `GET /api/inventory`, `POST /api/addToInventory`, `POST /api/addToner` — ICT and super administrators.

Email notifications are recorded in `email_notification` before the request transaction commits, then dispatched asynchronously through Resend. Delivery failures are logged and retained as failed records with error and attempt count. The unique `(request_id, notification_type)` key prevents duplicate enqueueing. Run `npm run retry:notifications` to retry failed deliveries; credentials are not returned by any API.

Set `FRONTEND_URL` to the deployed frontend origin so reset links open `/reset-password`. Password reset email uses the existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL` settings. Apply migration `002_password_reset.sql` before deploying the reset endpoints.

## Existing frontend compatibility

Toner catalog routes and fields remain available. Request submission now requires authentication and ignores client supplied identity fields. Configure the Version 2 frontend to include credentials (`credentials: "include"`) for API requests and call `/api/auth/me` to restore login state.
