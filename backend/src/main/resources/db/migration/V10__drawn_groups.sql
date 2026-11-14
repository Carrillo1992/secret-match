-- group: whether a Group's Draw is made, which freezes its membership (ticket #29, ADR 0001).
ALTER TABLE groups ADD COLUMN drawn BOOLEAN NOT NULL DEFAULT FALSE;

-- Groups drawn before this column existed.
UPDATE groups SET drawn = TRUE WHERE id IN (SELECT group_id FROM draws);
