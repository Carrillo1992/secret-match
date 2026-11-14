-- wishlist: the Wishes each Member keeps on their Wishlist in a Group (ticket #32). Nothing here, or anywhere
-- else, records who read which Wishlist.

CREATE TABLE wishes (
    id         UUID           PRIMARY KEY,
    group_id   UUID           NOT NULL,
    owner_id   UUID           NOT NULL,
    title      VARCHAR(100)   NOT NULL CHECK (title <> ''),
    -- An http or https address only; the scheme is checked by the API.
    link       VARCHAR(2000),
    -- Approximately, in euros, to the cent.
    price      NUMERIC(8, 2)  CHECK (price >= 0),
    notes      VARCHAR(1000),
    priority   VARCHAR(6)     NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    created_at TIMESTAMPTZ    NOT NULL,
    -- The owner is a Member of the Group. Deferred, because ending a membership deletes the Member's row before
    -- the Wishlist module deletes their Wishes, in the same transaction (MembershipEnded).
    CONSTRAINT wishes_owner_is_member FOREIGN KEY (group_id, owner_id)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- Reading one Member's Wishlist, and deleting it when their membership ends.
CREATE INDEX wishes_group_owner ON wishes (group_id, owner_id, created_at);
