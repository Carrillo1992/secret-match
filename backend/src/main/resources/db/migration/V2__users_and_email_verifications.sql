-- identity: Users and the links that verify their email (ticket #14).

CREATE TABLE users (
    id                UUID         PRIMARY KEY,
    -- Stored trimmed and in lower case, so the unique constraint is per inbox.
    email             VARCHAR(254) NOT NULL UNIQUE,
    display_name      VARCHAR(50)  NOT NULL,
    -- BCrypt; NULL for a User without a password (e.g. Google sign-in).
    password_hash     VARCHAR(100),
    email_verified_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL
);

CREATE TABLE email_verifications (
    -- SHA-256 of the link's token, as hex. The token itself is never stored.
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);

CREATE INDEX email_verifications_user_id_idx ON email_verifications (user_id);
