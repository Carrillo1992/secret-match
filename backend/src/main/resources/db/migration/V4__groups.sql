-- group: Groups and their Members (ticket #20).

CREATE TABLE groups (
    id            UUID          PRIMARY KEY,
    name          VARCHAR(80)   NOT NULL,
    -- A calendar day in Europe/Madrid, the app's one time zone.
    exchange_date DATE          NOT NULL,
    -- In euros, to the cent; NULL when the Group has no budget. Informational only.
    budget        NUMERIC(8, 2) CHECK (budget >= 0),
    admin_id      UUID          NOT NULL REFERENCES users (id),
    created_at    TIMESTAMPTZ   NOT NULL
);

CREATE TABLE group_members (
    group_id  UUID        NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    user_id   UUID        NOT NULL REFERENCES users (id),
    joined_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (group_id, user_id)
);

-- "Mis grupos": the Groups a User is a Member of.
CREATE INDEX group_members_user_id ON group_members (user_id);

-- The Admin is always one of the Members. Deferred, because a new Group's row goes in before its Members'.
ALTER TABLE groups
    ADD CONSTRAINT groups_admin_is_member FOREIGN KEY (id, admin_id)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED;
