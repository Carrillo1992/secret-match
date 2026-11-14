-- wishlist: each Member's Preferences and Don't List on their Wishlist in a Group (ticket #33). Nothing here, or
-- anywhere else, records who read which Wishlist.

-- At most one Preferences per Member and Group; a Member who wrote none has no row.
CREATE TABLE preferences (
    group_id UUID          NOT NULL,
    owner_id UUID          NOT NULL,
    text     VARCHAR(2000) NOT NULL CHECK (text <> ''),
    PRIMARY KEY (group_id, owner_id),
    -- The owner is a Member of the Group. Deferred, because ending a membership deletes the Member's row before
    -- the Wishlist module deletes their Preferences, in the same transaction (MembershipEnded).
    CONSTRAINT preferences_owner_is_member FOREIGN KEY (group_id, owner_id)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE dont_list_entries (
    id         UUID         PRIMARY KEY,
    group_id   UUID         NOT NULL,
    owner_id   UUID         NOT NULL,
    text       VARCHAR(100) NOT NULL CHECK (text <> ''),
    created_at TIMESTAMPTZ  NOT NULL,
    -- Deferred for the same reason as preferences_owner_is_member.
    CONSTRAINT dont_list_entries_owner_is_member FOREIGN KEY (group_id, owner_id)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- Reading one Member's Don't List, and deleting it when their membership ends.
CREATE INDEX dont_list_entries_group_owner ON dont_list_entries (group_id, owner_id, created_at);
