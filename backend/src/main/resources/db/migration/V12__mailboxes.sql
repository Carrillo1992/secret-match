-- mailbox: one anonymous conversation per Assignment, between a Giver and their Receiver (ticket #36).
-- Ids are random, so a Mailbox's id says nothing about who is in it, and nothing here is a global sequence that
-- could order Messages across Mailboxes.

CREATE TABLE mailboxes (
    id          UUID PRIMARY KEY,
    -- The Mailboxes belong to the Draw: cancelling it (deleting its row) takes them and their Messages along, so
    -- a later Draw never brings an old conversation back.
    group_id    UUID NOT NULL REFERENCES draws (group_id) ON DELETE CASCADE,
    -- NULL once the Giver deleted their account: their Receiver keeps the Mailbox, so its disappearing at the
    -- moment they leave the Group does not tell the Receiver who their Giver was.
    giver_id    UUID,
    receiver_id UUID NOT NULL,
    -- One per Assignment; opened lazily, so a second opening of the same one adds nothing (ON CONFLICT).
    CONSTRAINT mailboxes_one_per_assignment UNIQUE (group_id, giver_id, receiver_id),
    CONSTRAINT mailboxes_not_with_themselves CHECK (giver_id <> receiver_id),
    -- Both are Members of the Group (a NULL Giver is skipped). Deferred like the Assignments' (V9), so a Member's
    -- row and their Mailboxes can go in the same transaction.
    CONSTRAINT mailboxes_giver_is_member FOREIGN KEY (group_id, giver_id)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT mailboxes_receiver_is_member FOREIGN KEY (group_id, receiver_id)
        REFERENCES group_members (group_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- Finding a User's Mailboxes when they delete their account.
CREATE INDEX mailboxes_giver ON mailboxes (giver_id);
CREATE INDEX mailboxes_receiver ON mailboxes (receiver_id);

CREATE TABLE messages (
    id         UUID          PRIMARY KEY,
    mailbox_id UUID          NOT NULL REFERENCES mailboxes (id) ON DELETE CASCADE,
    -- The Giver or the Receiver of the Mailbox; checked by the API. NULL once a Giver who deleted their account
    -- wrote it.
    author_id  UUID,
    -- At most 1000 characters, and never blank; the blank check is the API's.
    text       VARCHAR(1000) NOT NULL CHECK (text <> ''),
    sent_at    TIMESTAMPTZ   NOT NULL
);

-- Reading a Mailbox's Messages, oldest first.
CREATE INDEX messages_mailbox_sent_at ON messages (mailbox_id, sent_at);
