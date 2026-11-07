-- identity: Password Resets, a User setting a new password through an emailed link (ticket #18).

CREATE TABLE password_resets (
    -- One per User: asking again replaces the row, so only the latest link works.
    user_id    UUID        PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    -- SHA-256 of the link's token, as hex. The token itself is never stored.
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);
