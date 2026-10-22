-- Two-factor sign-in (docs/design/15-security.md, 13-rbac.md).
--
-- `totp_secret` already existed for the design; this adds the two pieces the
-- flow needs: when the owner confirmed a code (`totp_enabled_at`) and hashed
-- one-time recovery codes (`totp_recovery_codes`). A user without an enabled
-- date simply signs in with the password as before.

ALTER TABLE "users" ADD COLUMN "totp_enabled_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "totp_recovery_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
