-- identity: Users, and the password sign-ups waiting for their email to be verified (ticket #14).

CREATE TABLE users (
    id            UUID         PRIMARY KEY,
    -- Stored trimmed and in lower case, so the unique constraint is per inbox.
    email         VARCHAR(254) NOT NULL UNIQUE,
    display_name  VARCHAR(50)  NOT NULL,
    -- BCrypt; NULL for a User without a password (e.g. Google sign-in, docs/architecture.md §2.4).
    password_hash VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL
);

-- A sign-up becomes a User only when its link is opened, with the details of that sign-up, so a later
-- sign-up with the same email can never change an earlier one's password.
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
