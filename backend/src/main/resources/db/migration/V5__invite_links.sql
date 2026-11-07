-- group: each Group's Invite Link (ticket #21).

-- The random code in the Invite Link. Groups created before this get one from two random UUIDs.
ALTER TABLE groups ADD COLUMN invite_code VARCHAR(64);

UPDATE groups
SET invite_code = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

ALTER TABLE groups
    ALTER COLUMN invite_code SET NOT NULL,
    ADD CONSTRAINT groups_invite_code_unique UNIQUE (invite_code);
