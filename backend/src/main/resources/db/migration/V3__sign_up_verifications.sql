-- identity: a password sign-up waits in its own row until its link is opened, and only then becomes a
-- User (ticket #14, after review). A later sign-up with the same email can no longer change an earlier
-- one's password, because each link creates the User with the details of its own sign-up.

DROP TABLE email_verifications;

-- Every User now has a verified email.
ALTER TABLE users DROP COLUMN email_verified_at;

CREATE TABLE sign_up_verifications (
    id            UUID         PRIMARY KEY,
    -- Not unique: several sign-ups may wait for the same email; the first one verified wins.
    email         VARCHAR(254) NOT NULL,
    display_name  VARCHAR(50)  NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    -- SHA-256 of the current link's token, as hex. The token itself is never stored.
    token_hash    VARCHAR(64)  NOT NULL UNIQUE,
    expires_at    TIMESTAMPTZ  NOT NULL,
    used_at       TIMESTAMPTZ
);
