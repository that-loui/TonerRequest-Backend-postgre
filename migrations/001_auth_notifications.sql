-- Active: 1785854559166@@127.0.0.1@5432@toner_request
BEGIN;

CREATE TABLE IF NOT EXISTS department (
    department_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO
    department (name)
VALUES ('HR'),
    ('Finance'),
    ('Marketing'),
    ('Claims'),
    ('GBUD(technical)'),
    ('ICT'),
    ('Life') ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS app_role (
    role_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE CHECK (
        name IN (
            'Employee',
            'ICT Administrator',
            'Super Administrator'
        )
    )
);

INSERT INTO
    app_role (name)
VALUES ('Employee'),
    ('ICT Administrator'),
    ('Super Administrator') ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS app_user (
    user_id BIGSERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    department_id BIGINT NOT NULL REFERENCES department (department_id),
    role_id BIGINT NOT NULL REFERENCES app_role (role_id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS app_user_department_idx ON app_user (department_id);

ALTER TABLE request
ADD COLUMN IF NOT EXISTS requester_user_id BIGINT REFERENCES app_user (user_id) ON DELETE SET NULL;

ALTER TABLE request
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending';

CREATE TABLE IF NOT EXISTS email_notification (
    notification_id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES request (request_id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (
        notification_type IN ('ict', 'requester')
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent', 'failed')
    ),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (request_id, notification_type)
);

CREATE INDEX IF NOT EXISTS email_notification_pending_idx ON email_notification (status, created_at);

COMMIT;