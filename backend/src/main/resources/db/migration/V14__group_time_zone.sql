-- group: each Group's Time Zone, the IANA id its Mailbox Message dates are cut in (ticket #74, ADR 0001). Groups
-- made before it keep UTC, the zone those dates were cut in until now. The application always sets it, so the
-- default only serves this migration.
ALTER TABLE groups ADD COLUMN time_zone VARCHAR(64) NOT NULL DEFAULT 'UTC';
ALTER TABLE groups ALTER COLUMN time_zone DROP DEFAULT;
