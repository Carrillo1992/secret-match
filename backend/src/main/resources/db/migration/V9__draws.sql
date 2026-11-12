-- draw: a Group's Draw and its Assignments (ticket #28). The random seed is never stored (ADR 0001).

-- One row per drawn Group: the primary key is what makes a second Draw of the same Group impossible.
CREATE TABLE draws (
    group_id UUID        PRIMARY KEY REFERENCES groups (id),
    drawn_at TIMESTAMPTZ NOT NULL
);

-- Who gives to whom. Nothing reads these rows but a Giver's own Assignment (ADR 0001).
CREATE TABLE assignments (
    group_id    UUID NOT NULL REFERENCES draws (group_id),
    giver_id    UUID NOT NULL,
    receiver_id UUID NOT NULL,
    PRIMARY KEY (group_id, giver_id),
    CONSTRAINT assignments_one_giver_per_receiver UNIQUE (group_id, receiver_id),
    CONSTRAINT assignments_not_to_themselves CHECK (giver_id <> receiver_id),
    -- Both are Members of the Group. Deferred like the Exclusions' (V7), so a Member's row and their Draw data
    -- can go in the same transaction.
    CONSTRAINT assignments_giver_is_member FOREIGN KEY (group_id, giver_id)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT assignments_receiver_is_member FOREIGN KEY (group_id, receiver_id)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED
);
