-- draw: the Exclusions the Admin sets between two Members of a Group (ticket #27).

CREATE TABLE exclusions (
    id         UUID        PRIMARY KEY,
    group_id   UUID        NOT NULL REFERENCES groups (id),
    -- An Exclusion is symmetric: its two Members are stored in a fixed order, so A–B and B–A are one row.
    member_a   UUID        NOT NULL,
    member_b   UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT exclusions_members_ordered CHECK (member_a < member_b),
    CONSTRAINT exclusions_unique_pair UNIQUE (group_id, member_a, member_b),
    -- Both are Members of the Group. Deferred, because ending a membership deletes the Member's row before the
    -- Draw module deletes their Exclusions, in the same transaction (MembershipEnded).
    CONSTRAINT exclusions_member_a_is_member FOREIGN KEY (group_id, member_a)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT exclusions_member_b_is_member FOREIGN KEY (group_id, member_b)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- Deleting a Member's Exclusions when their membership ends.
CREATE INDEX exclusions_member_b ON exclusions (group_id, member_b);
