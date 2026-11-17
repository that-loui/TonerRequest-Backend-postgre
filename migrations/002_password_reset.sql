BEGIN;

ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS password_reset_token (
  reset_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_token_user_idx
  ON password_reset_token(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS password_reset_token_expiry_idx
  ON password_reset_token(expires_at) WHERE used_at IS NULL;

COMMIT;
