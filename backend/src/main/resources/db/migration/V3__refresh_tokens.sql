-- identity: refresh tokens that keep a User signed in (ticket #15, docs/architecture.md §2.4).

CREATE TABLE refresh_tokens (
    -- SHA-256 of the token, as hex. The token itself only ever lives in the browser's cookie.
    token_hash  VARCHAR(64) PRIMARY KEY,
    -- One sign-in and every token rotated from it (the token family); revoked as a whole.
    session_id  UUID        NOT NULL,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    -- Set when the token was swapped for its successor; presenting it again is a reuse.
    rotated_at  TIMESTAMPTZ,
    -- Set when its session ended (sign-out, or a reuse was detected).
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX refresh_tokens_session_id ON refresh_tokens (session_id);
CREATE INDEX refresh_tokens_user_id ON refresh_tokens (user_id);
