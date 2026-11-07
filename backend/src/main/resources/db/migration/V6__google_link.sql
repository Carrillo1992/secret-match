-- identity: a User's Google link (ticket #16). The Google account's id (the ID token's `sub`), which never
-- changes; NULL for a User who has never signed in with Google.
ALTER TABLE users ADD COLUMN google_subject VARCHAR(255) UNIQUE;
