-- identity: each User's Language, and the one a Sign-up Verification was made in, which the User it creates gets
-- (ticket #88, spec #86). Rows made before it were made in Spanish, the only Language until now. The application
-- always sets it, so the default only serves this migration.
ALTER TABLE users ADD COLUMN language VARCHAR(2) NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en'));
ALTER TABLE users ALTER COLUMN language DROP DEFAULT;

ALTER TABLE sign_up_verifications ADD COLUMN language VARCHAR(2) NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en'));
ALTER TABLE sign_up_verifications ALTER COLUMN language DROP DEFAULT;
