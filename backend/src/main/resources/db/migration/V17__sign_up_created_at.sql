-- sign_up_verifications: when each sign-up was made (ticket #96). Signing in checks only the newest waiting sign-up
-- of an email, and a new link must not make an older one the newest. Rows made before it get the time their current
-- link was sent (a link is valid for 24 hours), the closest value known.
ALTER TABLE sign_up_verifications ADD COLUMN created_at TIMESTAMPTZ;
UPDATE sign_up_verifications SET created_at = expires_at - INTERVAL '24 hours';
ALTER TABLE sign_up_verifications ALTER COLUMN created_at SET NOT NULL;
